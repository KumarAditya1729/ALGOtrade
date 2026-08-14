"""Stock index data fetcher."""
from __future__ import annotations

import math
from typing import Any, Dict, List

from app.utils.logger import get_logger

logger = get_logger(__name__)

INDICES = [
    {"symbol": "^BSESN", "name_cn": "印度SENSEX", "name_en": "SENSEX", "region": "IN", "flag": "\U0001f1ee\U0001f1f3", "lat": 19.0760, "lng": 72.8777},
    {"symbol": "^NSEI", "name_cn": "印度NIFTY50", "name_en": "NIFTY 50", "region": "IN", "flag": "\U0001f1ee\U0001f1f3", "lat": 19.0760, "lng": 72.8777},
    {"symbol": "^NSEBANK", "name_cn": "印度BANKNIFTY", "name_en": "NIFTY BANK", "region": "IN", "flag": "\U0001f1ee\U0001f1f3", "lat": 19.0760, "lng": 72.8777},
    {"symbol": "^CNXIT", "name_cn": "印度NIFTYIT", "name_en": "NIFTY IT", "region": "IN", "flag": "\U0001f1ee\U0001f1f3", "lat": 19.0760, "lng": 72.8777},
]


def _safe_round(v, n=2):
    f = float(v)
    return 0 if math.isnan(f) or math.isinf(f) else round(f, n)


def fetch_stock_indices() -> List[Dict[str, Any]]:
    """Fetch major stock indices using yfinance."""
    try:
        import yfinance as yf

        symbols = [idx["symbol"] for idx in INDICES]
        tickers = yf.Tickers(" ".join(symbols))

        result = []
        for idx in INDICES:
            try:
                ticker = tickers.tickers.get(idx["symbol"])
                if ticker:
                    hist = ticker.history(period="5d")
                    closes = hist["Close"].dropna() if len(hist) > 0 else []

                    if len(closes) >= 2:
                        current = float(closes.iloc[-1])
                        prev_close = float(closes.iloc[-2])
                        change = ((current - prev_close) / prev_close) * 100 if prev_close else 0
                    elif len(closes) == 1:
                        current = float(closes.iloc[-1])
                        change = 0
                    else:
                        current = 0
                        change = 0

                    result.append({
                        "symbol": idx["symbol"],
                        "name_cn": idx["name_cn"],
                        "name_en": idx["name_en"],
                        "price": _safe_round(current),
                        "change": _safe_round(change),
                        "region": idx["region"],
                        "flag": idx["flag"],
                        "lat": idx["lat"],
                        "lng": idx["lng"],
                        "category": "index",
                    })
            except Exception as e:
                logger.debug("Failed to fetch %s: %s", idx["symbol"], e)
                result.append({
                    "symbol": idx["symbol"],
                    "name_cn": idx["name_cn"],
                    "name_en": idx["name_en"],
                    "price": 0,
                    "change": 0,
                    "region": idx["region"],
                    "flag": idx["flag"],
                    "lat": idx["lat"],
                    "lng": idx["lng"],
                    "category": "index",
                })

        return result
    except Exception as e:
        logger.error("Failed to fetch stock indices: %s", e)
        return []
