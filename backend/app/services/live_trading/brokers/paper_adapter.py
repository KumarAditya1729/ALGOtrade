"""Adapter for handling PAPER trading execution safely."""

import uuid
from typing import Any, Dict
from app.services.live_trading.adapters import LiveOrderPhaseAdapter
from app.services.live_trading.base import LiveOrderResult
from app.services.live_trading.contracts import OrderIntent, FillSnapshot, PositionSnapshot
from app.services.kline import KlineService
from app.services.live_trading.brokers.paper_config import PaperSimulationConfig

class PaperBrokerAdapter(LiveOrderPhaseAdapter):
    """
    A safe adapter for PAPER trading. 
    It intentionally does NOT inherit implementation details from LiveOrderPhaseAdapter
    that interact with real clients, but fulfills the same duck-typed contract.
    """
    def __init__(self, config: PaperSimulationConfig = None, *args, **kwargs):
        # We accept kwargs but ignore them to avoid trying to initialize CCXT clients.
        self.orders: Dict[str, OrderIntent] = {}
        self.fills: Dict[str, float] = {}
        self.config = config or PaperSimulationConfig.default()
        
    def place_market_order(self, intent: OrderIntent) -> LiveOrderResult:
        if (intent.quantity or 0) <= 0:
            raise ValueError("Order quantity must be strictly positive")
        order_id = f"paper_{uuid.uuid4().hex[:8]}"
        self.orders[order_id] = intent
        self.fills[order_id] = 0.0
        return LiveOrderResult(
            exchange_id="paper",
            exchange_order_id=order_id,
            filled=0.0,
            avg_price=0.0,
            raw={"status": "open", "filled": 0.0, "id": order_id}
        )

    def place_limit_order(self, intent: OrderIntent) -> LiveOrderResult:
        if (intent.quantity or 0) <= 0:
            raise ValueError("Order quantity must be strictly positive")
        order_id = f"paper_{uuid.uuid4().hex[:8]}"
        self.orders[order_id] = intent
        self.fills[order_id] = 0.0
        return LiveOrderResult(
            exchange_id="paper",
            exchange_order_id=order_id,
            filled=0.0,
            avg_price=0.0,
            raw={"status": "open", "filled": 0.0, "id": order_id}
        )

    def cancel_order(self, intent: OrderIntent, *, order_id: str = "") -> Dict[str, Any]:
        if order_id in self.orders:
            return {"status": "canceled", "id": order_id}
        return {"status": "error", "message": "Order not found"}

    def wait_for_fill(
        self,
        intent: OrderIntent,
        *,
        order_id: str = "",
        max_wait_sec: float = 15.0,
    ) -> FillSnapshot:
        qty = intent.quantity or 0.0
        if qty <= 0:
            return FillSnapshot(filled_qty=0.0, avg_price=0.0, status="failed", raw={"error": "invalid qty"}, fees_by_ccy={})

        last_price = None
        if "mock_last_price" in intent.exchange_config:
            last_price = float(intent.exchange_config["mock_last_price"])
        else:
            kline = KlineService()
            market = str(intent.exchange_config.get("exchange_id") or "binance") # Fallback
            rows = kline.get_kline(market=market, symbol=intent.symbol, timeframe="1m", limit=1) or []
            
            if rows:
                last = rows[-1]
                if isinstance(last, dict):
                    for k in ("close", "c", "Close"):
                        if last.get(k) is not None:
                            last_price = float(last.get(k))
                            break
            
            if last_price is None:
                # Fallback if no market data available
                last_price = intent.price if (intent.price and intent.price > 0) else 100.0

        is_limit = bool(intent.price and intent.price > 0)
        side = str(intent.side).lower()
        
        # Insufficient liquidity check
        if self.config.max_fill_per_tick is not None:
            max_fill = self.config.max_fill_per_tick
        else:
            max_fill = float('inf')
            
        if max_fill <= 0:
            return FillSnapshot(filled_qty=self.fills.get(order_id, 0.0), avg_price=0.0, status="open", raw={"error": "insufficient liquidity"}, fees_by_ccy={})

        if is_limit:
            limit_price = float(intent.price)
            if side == "buy" and last_price > limit_price:
                # Not filled yet
                return FillSnapshot(filled_qty=self.fills.get(order_id, 0.0), avg_price=0.0, status="open", raw={"simulated": True}, fees_by_ccy={})
            elif side == "sell" and last_price < limit_price:
                # Not filled yet
                return FillSnapshot(filled_qty=self.fills.get(order_id, 0.0), avg_price=0.0, status="open", raw={"simulated": True}, fees_by_ccy={})
            fill_price = limit_price # Assume filled at limit price
        else:
            # Market order slippage
            slippage_mult = self.config.slippage_bps / 10000.0
            if side == "buy":
                fill_price = last_price * (1 + slippage_mult)
            else:
                fill_price = last_price * (1 - slippage_mult)

        previously_filled = self.fills.get(order_id, 0.0)
        remaining = qty - previously_filled
        
        if remaining <= 0:
            return FillSnapshot(
                filled_qty=qty, avg_price=fill_price, status="closed",
                raw={"simulated": True}, fees_by_ccy={}
            )
            
        fill_amount = min(remaining, max_fill)
        new_filled = previously_filled + fill_amount
        self.fills[order_id] = new_filled
        
        status = "closed" if new_filled >= qty else "open"

        # Simulate Fees
        fee_rate = self.config.commission_rate_bps / 10000.0 if self.config.commission_model != "zero" else 0.0
        fee_value = fill_price * new_filled * fee_rate
        
        # Determine quote currency dynamically
        symbol = str(intent.symbol)
        quote_currency = "USD" # Default fallback
        if "/" in symbol:
            quote_currency = symbol.split("/")[-1].strip()
        elif symbol.endswith("USDT"):
            quote_currency = "USDT"
        
        return FillSnapshot(
            filled_qty=new_filled,
            avg_price=fill_price,
            status=status,
            raw={"simulated": True, "last_market_price": last_price, "partial": status == "open"},
            fees_by_ccy={quote_currency: fee_value}
        )
        
    def query_position(self, intent: OrderIntent) -> PositionSnapshot:
        raise NotImplementedError("position queries are handled by the position sync service")
