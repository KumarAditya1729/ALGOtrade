import os
import re

SHIMS_DIR = "/Users/aditya/Desktop/calculatedrisk/backend/app/services/live_trading/brokers/_shims"
COMPAT_FILE = "/Users/aditya/Desktop/calculatedrisk/backend/app/services/live_trading/calculatedrisk_compat.py"
BROKERS_DIR = "/Users/aditya/Desktop/calculatedrisk/backend/app/services/live_trading/brokers"

# Create calculatedrisk_compat.py
compat_code = """
import logging
import httpx
from typing import Any

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
"""

with open(COMPAT_FILE, "w") as f:
    f.write(compat_code.strip() + "\n")

# Now patch all brokers files
def patch_file(filepath):
    with open(filepath, 'r') as f:
        content = f.read()

    original = content
    
    # regex to match from app.services.live_trading.brokers._shims.utils.xyz import a, b, c
    content = re.sub(
        r'from app\.services\.live_trading\.brokers\._shims\.[a-zA-Z_]+\.[a-zA-Z_]+ import (.+)',
        r'from app.services.live_trading.calculatedrisk_compat import \1',
        content
    )
    
    # regex to match from app.services.live_trading.brokers._shims.database.auth_db import ...
    content = re.sub(
        r'from app\.services\.live_trading\.brokers\._shims\.database\.auth_db import (.+)',
        r'from app.services.live_trading.calculatedrisk_compat import \1',
        content
    )

    if content != original:
        with open(filepath, 'w') as f:
            f.write(content)
        print(f"Patched {filepath}")

for root, dirs, files in os.walk(BROKERS_DIR):
    for file in files:
        if file.endswith('.py') and '_shims' not in root:
            patch_file(os.path.join(root, file))

print("Done patching.")
