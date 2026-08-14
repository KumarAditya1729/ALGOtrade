# websocket_proxy/__init__.py

import logging

from .base_adapter import (
    BaseBrokerWebSocketAdapter,
    ENABLE_CONNECTION_POOLING,
    MAX_SYMBOLS_PER_WEBSOCKET,
    MAX_WEBSOCKET_CONNECTIONS,
)
from .broker_factory import (
    cleanup_all_pools,
    create_broker_adapter,
    get_pool_stats,
    get_resource_health,
    register_adapter,
)
from .connection_manager import (
    ConnectionPool,
    SharedZmqPublisher,
    get_max_symbols_per_websocket,
    get_max_websocket_connections,
)
from .server import WebSocketProxy
from .server import main as websocket_main

# Set up logger
logger = logging.getLogger(__name__)

# Import the angel_adapter directly from the broker directory
from app.services.live_trading.brokers.angel.streaming.angel_adapter import AngelWebSocketAdapter

# Import the compositedge_adapter
from app.services.live_trading.brokers.compositedge.streaming.compositedge_adapter import CompositedgeWebSocketAdapter

# Import the definedge_adapter
from app.services.live_trading.brokers.definedge.streaming.definedge_adapter import DefinedgeWebSocketAdapter

# Import the dhan_adapter
from app.services.live_trading.brokers.dhan.streaming.dhan_adapter import DhanWebSocketAdapter

# Import the fivepaisa_adapter
from app.services.live_trading.brokers.fivepaisa.streaming.fivepaisa_adapter import FivepaisaWebSocketAdapter

# Import the fivepaisaxts_adapter
from app.services.live_trading.brokers.fivepaisaxts.streaming.fivepaisaxts_adapter import FivepaisaXTSWebSocketAdapter

# Import the flattrade_adapter
from app.services.live_trading.brokers.flattrade.streaming.flattrade_adapter import FlattradeWebSocketAdapter

# Import the fyers_adapter
from app.services.live_trading.brokers.fyers.streaming.fyers_websocket_adapter import FyersWebSocketAdapter

# Import the ibulls_adapter
from app.services.live_trading.brokers.ibulls.streaming.ibulls_adapter import IbullsWebSocketAdapter

# Import the iifl_adapter
from app.services.live_trading.brokers.iifl.streaming.iifl_adapter import IiflWebSocketAdapter

# Import the iiflcapital_adapter
from app.services.live_trading.brokers.iiflcapital.streaming.iiflcapital_adapter import IiflcapitalWebSocketAdapter

# Import the indmoney_adapter
from app.services.live_trading.brokers.indmoney.streaming.indmoney_adapter import IndmoneyWebSocketAdapter

# Import the fivepaisaxts_adapter
from app.services.live_trading.brokers.jainamxts.streaming.jainamxts_adapter import JainamXTSWebSocketAdapter

# Import the kotak_adapter
from app.services.live_trading.brokers.kotak.streaming.kotak_adapter import KotakWebSocketAdapter

# Import the motilal_adapter
from app.services.live_trading.brokers.motilal.streaming.motilal_adapter import MotilalWebSocketAdapter

# Import the mstock_adapter
from app.services.live_trading.brokers.mstock.streaming.mstock_adapter import MstockWebSocketAdapter

# Import the nubra_adapter
from app.services.live_trading.brokers.nubra.streaming.nubra_adapter import NubraWebSocketAdapter

# Import the paytm_adapter
from app.services.live_trading.brokers.paytm.streaming.paytm_adapter import PaytmWebSocketAdapter

# Import the pocketful_adapter
from app.services.live_trading.brokers.pocketful.streaming.pocketful_adapter import PocketfulWebSocketAdapter

# Import the rmoney_adapter
from app.services.live_trading.brokers.rmoney.streaming.rmoney_adapter import RMoneyWebSocketAdapter

# Import the samco_adapter
from app.services.live_trading.brokers.samco.streaming.samco_adapter import SamcoWebSocketAdapter

# Import the shoonya_adapter
from app.services.live_trading.brokers.shoonya.streaming.shoonya_adapter import ShoonyaWebSocketAdapter

# Import the tradesmart_adapter
from app.services.live_trading.brokers.tradesmart.streaming.tradesmart_adapter import TradeSmartWebSocketAdapter

# Import the upstox_adapter
from app.services.live_trading.brokers.upstox.streaming.upstox_adapter import UpstoxWebSocketAdapter

# Import the wisdom_adapter
from app.services.live_trading.brokers.wisdom.streaming.wisdom_adapter import WisdomWebSocketAdapter

# Import the zerodha_adapter
from app.services.live_trading.brokers.zerodha.streaming.zerodha_adapter import ZerodhaWebSocketAdapter

# Import the arrow_adapter
from app.services.live_trading.brokers.arrow.streaming.arrow_adapter import ArrowWebSocketAdapter

# Import the hdfcsky_adapter
from app.services.live_trading.brokers.hdfcsky.streaming.hdfcsky_adapter import HDFCSkyWebSocketAdapter

# Import the hdfcsecurities_adapter
from app.services.live_trading.brokers.hdfcsecurities.streaming.hdfcsecurities_adapter import (
    HDFCSecuritiesWebSocketAdapter,
)

# AliceBlue adapter will be loaded dynamically

# Register adapters
register_adapter("angel", AngelWebSocketAdapter)
register_adapter("zerodha", ZerodhaWebSocketAdapter)
register_adapter("dhan", DhanWebSocketAdapter)
register_adapter("flattrade", FlattradeWebSocketAdapter)
register_adapter("shoonya", ShoonyaWebSocketAdapter)
register_adapter("tradesmart", TradeSmartWebSocketAdapter)
register_adapter("ibulls", IbullsWebSocketAdapter)
register_adapter("compositedge", CompositedgeWebSocketAdapter)
register_adapter("fivepaisa", FivepaisaWebSocketAdapter)
register_adapter("fivepaisaxts", FivepaisaXTSWebSocketAdapter)
register_adapter("iifl", IiflWebSocketAdapter)
register_adapter("iiflcapital", IiflcapitalWebSocketAdapter)
register_adapter("wisdom", WisdomWebSocketAdapter)
register_adapter("upstox", UpstoxWebSocketAdapter)
register_adapter("kotak", KotakWebSocketAdapter)
register_adapter("fyers", FyersWebSocketAdapter)
register_adapter("definedge", DefinedgeWebSocketAdapter)
register_adapter("paytm", PaytmWebSocketAdapter)
register_adapter("indmoney", IndmoneyWebSocketAdapter)
register_adapter("mstock", MstockWebSocketAdapter)
register_adapter("motilal", MotilalWebSocketAdapter)
register_adapter("jainamxts", JainamXTSWebSocketAdapter)
register_adapter("samco", SamcoWebSocketAdapter)
register_adapter("pocketful", PocketfulWebSocketAdapter)
register_adapter("nubra", NubraWebSocketAdapter)
register_adapter("rmoney", RMoneyWebSocketAdapter)
register_adapter("arrow", ArrowWebSocketAdapter)
register_adapter("hdfcsky", HDFCSkyWebSocketAdapter)
register_adapter("hdfcsecurities", HDFCSecuritiesWebSocketAdapter)

# AliceBlue adapter will be registered dynamically when first used

__all__ = [
    # Core classes
    "WebSocketProxy",
    "websocket_main",
    "register_adapter",
    "create_broker_adapter",
    # Base adapter (for cleanup utilities)
    "BaseBrokerWebSocketAdapter",
    # Connection pooling (multi-websocket support)
    "ConnectionPool",
    "SharedZmqPublisher",
    "get_pool_stats",
    "get_resource_health",
    "cleanup_all_pools",
    "get_max_symbols_per_websocket",
    "get_max_websocket_connections",
    # Configuration constants
    "MAX_SYMBOLS_PER_WEBSOCKET",
    "MAX_WEBSOCKET_CONNECTIONS",
    "ENABLE_CONNECTION_POOLING",
    # Broker adapters
    "AngelWebSocketAdapter",
    "ZerodhaWebSocketAdapter",
    "DhanWebSocketAdapter",
    "FlattradeWebSocketAdapter",
    "ShoonyaWebSocketAdapter",
    "TradeSmartWebSocketAdapter",
    "IbullsWebSocketAdapter",
    "CompositedgeWebSocketAdapter",
    "FivepaisaWebSocketAdapter",
    "FivepaisaXTSWebSocketAdapter",
    "IiflWebSocketAdapter",
    "IiflcapitalWebSocketAdapter",
    "JainamWebSocketAdapter",
    "TrustlineWebSocketAdapter",
    "WisdomWebSocketAdapter",
    "UpstoxWebSocketAdapter",
    "KotakWebSocketAdapter",
    "FyersWebSocketAdapter",
    "DefinedgeWebSocketAdapter",
    "PaytmWebSocketAdapter",
    "IndmoneyWebSocketAdapter",
    "MstockWebSocketAdapter",
    "MotilalWebSocketAdapter",
    "JainamXTSWebSocketAdapter",
    "SamcoWebSocketAdapter",
    "PocketfulWebSocketAdapter",
    "NubraWebSocketAdapter",
    "RMoneyWebSocketAdapter",
    "ArrowWebSocketAdapter",
    "HDFCSkyWebSocketAdapter",
    "HDFCSecuritiesWebSocketAdapter",
]
