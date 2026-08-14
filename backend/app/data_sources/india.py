import datetime
from typing import Dict, List, Any, Optional
import httpx
from flask import request

from app.data_sources.base import BaseDataSource
from app.utils.logger import get_logger
from app.services.live_trading.credentials.service import CredentialService
from app.utils.auth import verify_token
from app.utils.db import get_db_connection

logger = get_logger(__name__)

class IndiaDataSource(BaseDataSource):
    """
    Data source for Indian Stock Market (Dalal Street) via Angel One SmartAPI.
    Uses the authenticated user's credentials to fetch historical K-lines.
    """
    
    BASE_URL = "https://apiconnect.angelbroking.com"
    
    @classmethod
    def _get_user_credentials(cls) -> Optional[Dict[str, Any]]:
        """Fetch the first active Angel One API credentials from the DB."""
        try:
            with get_db_connection() as db:
                cur = db.cursor()
                cur.execute(
                    "SELECT encrypted_config FROM qd_exchange_credentials WHERE exchange_id = 'angel' ORDER BY id DESC LIMIT 1"
                )
                row = cur.fetchone()
                cur.close()
            
            if row and row.get("encrypted_config"):
                from app.utils.credential_crypto import decrypt_credential_blob
                import json
                decrypted = decrypt_credential_blob(row["encrypted_config"])
                return json.loads(decrypted) if decrypted else None
            return None
        except Exception as e:
            logger.error(f"Failed to load AngelOne credentials for klines: {e}")
            return None

    @classmethod
    def _lookup_instrument_token(cls, symbol: str) -> Optional[str]:
        """Look up the instrument token for a symbol in qd_market_symbols."""
        with get_db_connection() as db:
            cur = db.cursor()
            cur.execute(
                "SELECT instrument_id FROM qd_market_symbols WHERE market IN ('NSE', 'BSE', 'NFO', 'MCX', 'BFO', 'CDS') AND symbol = %s LIMIT 1",
                (symbol,)
            )
            row = cur.fetchone()
            cur.close()
            
        if row and row.get("instrument_id"):
            return row["instrument_id"]
        return None
    
    @classmethod
    def get_kline(
        cls,
        symbol: str,
        timeframe: str,
        limit: int = 300,
        before_time: Optional[int] = None,
        exchange_id: Optional[str] = None,
        market_type: Optional[str] = None,
    ) -> List[Dict[str, Any]]:
        """
        Fetch historical OHLCV data from Angel One SmartAPI.
        """
        interval_map = {
            '1m': 'ONE_MINUTE',
            '3m': 'THREE_MINUTE',
            '5m': 'FIVE_MINUTE',
            '10m': 'TEN_MINUTE',
            '15m': 'FIFTEEN_MINUTE',
            '30m': 'THIRTY_MINUTE',
            '1H': 'ONE_HOUR',
            '1h': 'ONE_HOUR',
            '1D': 'ONE_DAY',
            '1d': 'ONE_DAY',
        }
        
        interval = interval_map.get(timeframe, 'ONE_DAY')
        ex_id = exchange_id if exchange_id else "NSE"
        
        # Determine token
        # If market_type contains a numeric token (hacky pass-through), use it, otherwise lookup
        token = market_type if market_type and market_type.isdigit() else cls._lookup_instrument_token(symbol)
        
        if not token:
            logger.error(f"Could not resolve instrument token for AngelOne: {symbol}")
            return cls._fallback_yfinance(symbol, interval, limit)
            
        creds = cls._get_user_credentials()
        if not creds:
            logger.error("No AngelOne credentials found for historical data.")
            return cls._fallback_yfinance(symbol, interval, limit)
            
        jwt_token = creds.get("access_token", "")
        api_key = creds.get("api_key", "")
        
        if not jwt_token or not api_key:
            logger.error("Missing jwt_token or api_key in AngelOne credentials.")
            return cls._fallback_yfinance(symbol, interval, limit)
            
        # Calculate from/to dates
        now = datetime.datetime.now()
        if before_time:
            end_date = datetime.datetime.fromtimestamp(before_time)
        else:
            end_date = now
            
        # Calculate start_date based on limit and timeframe
        delta_days = 30
        if interval == 'ONE_MINUTE':
            delta_days = max(1, limit / 375) # 375 min per trading day
        elif interval in ('THREE_MINUTE', 'FIVE_MINUTE'):
            delta_days = max(2, limit / (375/5))
        elif interval in ('TEN_MINUTE', 'FIFTEEN_MINUTE', 'THIRTY_MINUTE', 'ONE_HOUR'):
            delta_days = max(5, limit / 6)
        elif interval == 'ONE_DAY':
            delta_days = limit * 1.5 # account for weekends
            
        start_date = end_date - datetime.timedelta(days=int(delta_days + 5))
        
        payload = {
            "exchange": ex_id,
            "symboltoken": token,
            "interval": interval,
            "fromdate": start_date.strftime("%Y-%m-%d %H:%M"),
            "todate": end_date.strftime("%Y-%m-%d %H:%M")
        }
        
        headers = {
            "Authorization": f"Bearer {jwt_token}",
            "Content-Type": "application/json",
            "Accept": "application/json",
            "X-PrivateKey": api_key,
            "X-ClientLocalIP": "127.0.0.1",
            "X-ClientPublicIP": "127.0.0.1",
            "X-MACAddress": "00:00:00:00:00:00",
            "X-UserType": "USER",
            "X-SourceID": "WEB"
        }
        
        try:
            # We must use synchronous httpx because this method is synchronous
            with httpx.Client() as client:
                res = client.post(
                    f"{cls.BASE_URL}/rest/secure/angelbroking/historical/v1/getCandleData",
                    json=payload,
                    headers=headers,
                    timeout=10.0
                )
                
            data = res.json()
            if not data.get("status"):
                logger.error(f"AngelOne Historical API Error: {data.get('message')}")
                return []
                
            candles = data.get("data") or []
            # AngelOne returns: ["2021-02-08T09:00:00+05:30", open, high, low, close, volume]
            
            result = []
            for c in candles:
                try:
                    # Parse ISO format datetime
                    dt = datetime.datetime.fromisoformat(c[0])
                    result.append({
                        "time": int(dt.timestamp() * 1000),
                        "open": float(c[1]),
                        "high": float(c[2]),
                        "low": float(c[3]),
                        "close": float(c[4]),
                        "volume": float(c[5]),
                    })
                except Exception as parse_e:
                    logger.debug(f"Failed to parse candle {c}: {parse_e}")
            
            if not result:
                logger.info("AngelOne returned empty data or failed, using yfinance fallback.")
                return cls._fallback_yfinance(symbol, interval, limit)
            
            # Ensure we only return `limit` items up to `before_time`
            result.sort(key=lambda x: x["timestamp"])
            return result[-limit:]
            
        except Exception as e:
            logger.error(f"AngelOne Historical API Exception: {e}")
            return cls._fallback_yfinance(symbol, interval, limit)

    @classmethod
    def _fallback_yfinance(cls, symbol: str, interval: str, limit: int) -> list:
        try:
            import yfinance as yf
            
            # Map AngelOne interval to yfinance interval
            yf_interval_map = {
                'ONE_MINUTE': '1m',
                'THREE_MINUTE': '1m',
                'FIVE_MINUTE': '5m',
                'TEN_MINUTE': '5m',
                'FIFTEEN_MINUTE': '15m',
                'THIRTY_MINUTE': '30m',
                'ONE_HOUR': '1h',
                'ONE_DAY': '1d'
            }
            yf_int = yf_interval_map.get(interval, '1d')
            
            yf_symbol = symbol.replace('-EQ', '') + '.NS'
            
            if yf_int == '1d':
                period = '1y'
            elif yf_int in ('1m'):
                period = '7d'
            else:
                period = '1mo'
                
            ticker = yf.Ticker(yf_symbol)
            df = ticker.history(period=period, interval=yf_int)
            if df.empty:
                return []
            
            df = df.tail(limit)
            result = []
            for date, row in df.iterrows():
                result.append({
                    "time": int(date.timestamp() * 1000),
                    "open": float(row["Open"]),
                    "high": float(row["High"]),
                    "low": float(row["Low"]),
                    "close": float(row["Close"]),
                    "volume": float(row["Volume"]),
                })
            return result
        except Exception as e:
            import logging
            logging.error(f"yfinance fallback failed for {symbol}: {e}")
            return []

    @classmethod
    def get_ticker(
        cls,
        symbol: str,
        exchange_id: Optional[str] = None,
        market_type: Optional[str] = None,
    ) -> Optional[Dict[str, Any]]:
        # For now, return None. Live ticker data is usually fetched via websocket.
        return None
