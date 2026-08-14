"""Adapter to run CalculatedRisk broker plugins inside CalculatedRisk's execution flow."""

import importlib
import logging
from typing import Any, Dict

from app.services.live_trading.adapters import LiveOrderPhaseAdapter
from app.services.live_trading.base import LiveOrderResult
from app.services.live_trading.contracts import FillSnapshot, OrderIntent
from app.services.live_trading.contracts import FillSnapshot, OrderIntent

logger = logging.getLogger(__name__)


class CalculatedRiskAdapter(LiveOrderPhaseAdapter):
    """Adapter bridging CalculatedRisk's OrderIntent to CalculatedRisk's order APIs."""

    def _get_api_module(self):
        """Dynamically load the CalculatedRisk order_api module for this broker."""
        broker_name = self.exchange_id.lower()
        module_path = f"app.services.live_trading.brokers.{broker_name}.api.order_api"
        try:
            return importlib.import_module(module_path)
        except ImportError as exc:
            logger.error(f"Failed to load CalculatedRisk plugin for {broker_name}: {exc}")
            raise ValueError(f"Unsupported CalculatedRisk broker: {broker_name}") from exc



    def _map_to_calculatedrisk_payload(self, intent: OrderIntent, order_type: str, price: float = 0.0) -> Dict[str, Any]:
        """Convert CalculatedRisk OrderIntent to CalculatedRisk's order placement schema."""
        action = "BUY" if intent.side.lower() == "buy" else "SELL"
        
        return {
            "symbol": intent.symbol,
            "action": action,
            "quantity": float(intent.quantity or 0.0),
            "price": price,
            "order_type": order_type.upper(),  # MARKET, LIMIT
            "product_type": "MIS" if getattr(intent, "market_type", "spot") == "margin" else "CNC",
            # Additional metadata that CalculatedRisk might need
            "exchange": "NSE",  # A default, could be mapped based on symbol
            "client_order_id": intent.client_order_id
        }

    def _get_auth(self) -> str:
        if self.broker_credentials:
            return self.broker_credentials.api_key or self.broker_credentials.access_token or ""
        return self.exchange_config.get("api_key", self.exchange_config.get("access_token", ""))

    def find_order_by_client_id(self, client_order_id: str) -> Optional[Dict[str, Any]]:
        api_module = self._get_api_module()
        auth = self._get_auth()
        
        if hasattr(api_module, "get_order_by_client_id_api"):
            try:
                resp = api_module.get_order_by_client_id_api(auth, client_order_id)
                if resp:
                    return {"id": resp.get("order_id", ""), "raw": resp}
            except Exception as exc:
                logger.warning(f"find_order_by_client_id failed for {client_order_id}: {exc}")
        return None

    def place_market_order(self, intent: OrderIntent) -> LiveOrderResult:
        if str(self.exchange_config.get("execution_mode", "")).upper() == "PAPER":
            raise RuntimeError("Live execution adapter called in PAPER mode")
            

        api_module = self._get_api_module()
        auth = self._get_auth()
        
        payload = self._map_to_calculatedrisk_payload(intent, "MARKET")
        if hasattr(api_module, "place_order_api"):
            res = api_module.place_order_api(payload, auth)
            order_id = res.get("data", {}).get("order_id", "") if isinstance(res, dict) else ""
            if not order_id and isinstance(res, dict):
                order_id = res.get("order_id", "")
                
            return LiveOrderResult(
                exchange_id=self.exchange_id,
                exchange_order_id=str(order_id),
                filled=0.0,
                avg_price=0.0,
                raw=res if isinstance(res, dict) else {}
            )
        else:
            raise NotImplementedError(f"place_order_api not found in {self.exchange_id}")

    def place_limit_order(self, intent: OrderIntent) -> LiveOrderResult:
        if str(self.exchange_config.get("execution_mode", "")).upper() == "PAPER":
            raise RuntimeError("Live execution adapter called in PAPER mode")
            

        api_module = self._get_api_module()
        auth = self._get_auth()
        
        payload = self._map_to_calculatedrisk_payload(intent, "LIMIT", price=float(intent.price or 0.0))
        if hasattr(api_module, "place_order_api"):
            res = api_module.place_order_api(payload, auth)
            order_id = res.get("data", {}).get("order_id", "") if isinstance(res, dict) else ""
            if not order_id and isinstance(res, dict):
                order_id = res.get("order_id", "")
                
            return LiveOrderResult(
                exchange_id=self.exchange_id,
                exchange_order_id=str(order_id),
                filled=0.0,
                avg_price=0.0,
                raw=res if isinstance(res, dict) else {}
            )
        else:
            raise NotImplementedError(f"place_order_api not found in {self.exchange_id}")

    def cancel_order(self, intent: OrderIntent, *, order_id: str = "") -> Dict[str, Any]:

        api_module = self._get_api_module()
        auth = self._get_auth()
        
        if hasattr(api_module, "cancel_order"):
            res = api_module.cancel_order(order_id, auth)
            return res if isinstance(res, dict) else {"raw": res}
        return {"error": "cancel_order not implemented"}

    def wait_for_fill(
        self,
        intent: OrderIntent,
        *,
        order_id: str = "",
        max_wait_sec: float = 15.0,
    ) -> FillSnapshot:
        """Poll the broker for order status until filled or timeout."""
        import time

        api_module = self._get_api_module()
        auth = self._get_auth()
        
        start = time.time()
        while time.time() - start < max_wait_sec:
            if hasattr(api_module, "get_order_book"):
                status_res = api_module.get_order_book(auth)
                if isinstance(status_res, dict) and "data" in status_res:
                    orders = status_res.get("data", [])
                    if not isinstance(orders, list):
                        orders = [orders]
                    for order in orders:
                        if isinstance(order, dict) and str(order.get("order_id", "")) == str(order_id):
                            status = str(order.get("status", "")).upper()
                            if status in ("COMPLETE", "FILLED", "TRADED"):
                                return FillSnapshot(
                                    filled_qty=float(order.get("filled_quantity", intent.quantity)),
                                    avg_price=float(order.get("average_price", intent.price or 0.0)),
                                    status="filled",
                                    raw=order
                                )
                            if status in ("REJECTED", "CANCELLED"):
                                return FillSnapshot(
                                    filled_qty=0.0,
                                    avg_price=0.0,
                                    status="canceled",
                                    raw=order
                                )
            time.sleep(1.0)
            
        return FillSnapshot(
            filled_qty=0.0,
            avg_price=0.0,
            status="open",
            raw={"timeout": True}
        )
