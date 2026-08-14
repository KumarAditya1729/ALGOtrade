import logging
import httpx
import os
from typing import Any
import contextvars

# Context variable for holding current request's broker credentials
current_broker_config = contextvars.ContextVar('current_broker_config', default=None)

def get_broker_env(key: str, default: Any = None) -> Any:
    """
    Get broker credentials dynamically for SaaS mode.
    First checks the ContextVar (loaded from DB during this request).
    Falls back to os.getenv (for legacy .env compatibility).
    """
    config = current_broker_config.get()
    if config and isinstance(config, dict):
        if key in config:
            return config[key]
        
        # Also map standard BROKER_API_KEY to config['api_key'] etc
        if key == "BROKER_API_KEY" and "api_key" in config:
            return config["api_key"]
        if key == "BROKER_API_SECRET" and "api_secret" in config:
            return config["api_secret"]
        if key == "BROKER_API_KEY_MARKET" and "passphrase" in config:
            return config["passphrase"]
            
    return os.getenv(key, default)


# -- logging --
def get_logger(name):
    logger = logging.getLogger(name)
    logger.setLevel(logging.INFO)
    return logger

# -- httpx_client --
_client = None
def get_httpx_client():
    global _client
    if _client is None:
        _client = httpx.Client(timeout=10.0)
    return _client

def get_async_httpx_client():
    return httpx.AsyncClient(timeout=10.0)

# -- token_db --
def get_symbol(exchange, token): return f"{exchange}:{token}"
def get_token(exchange, symbol): return "12345"
def get_br_symbol(broker, exchange, symbol): return symbol
def get_oa_symbol(broker, exchange, symbol): return symbol
def get_brexchange(broker, exchange): return exchange
def get_symbol_info(symbol, exchange): return {"lot_size": 1, "multiplier": 1, "instrument_type": "EQ"}

# -- engine_factory --
def create_db_engine(): return None

# -- mpp_slab --
def calculate_protected_price(price, action, instrument_type, exchange): return price
def get_instrument_type_from_symbol(symbol): return "EQ"

# -- auth_db leftovers if any --
def decrypt_token(token): return token
def safe_decrypt_token(token): return token
def encrypt_token(token): return token
Auth = None

def verify_api_key(api_key: str) -> str:
    # Look up user by API key in QuantDinger DB or auth system
    # Default to user_1 for sandbox if not implemented
    return "user_1"

def get_broker_name(user_id: str) -> str:
    # Look up default broker for user
    return "zerodha"

def get_market_data_service():
    class DummyMarketDataService:
        def process_market_data(self, data):
            pass
    return DummyMarketDataService()
