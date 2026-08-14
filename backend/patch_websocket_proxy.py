import os
import re

PROXY_DIR = "/Users/aditya/Desktop/calculatedrisk/backend/app/services/websocket_proxy"

def patch_file(filepath):
    with open(filepath, 'r') as f:
        content = f.read()

    original = content

    # Replace auth_db imports
    content = re.sub(
        r'from database\.auth_db import.*',
        'from app.services.live_trading.calculatedrisk_compat import get_broker_name, verify_api_key',
        content
    )
    
    # Replace market_data_service imports
    content = re.sub(
        r'from services\.market_data_service import.*',
        'from app.services.live_trading.calculatedrisk_compat import get_market_data_service',
        content
    )
    
    # Replace utils.logging
    content = re.sub(
        r'from utils\.logging import.*',
        'from app.services.live_trading.calculatedrisk_compat import get_logger, highlight_url',
        content
    )
    
    # Replace dot-env
    content = re.sub(
        r'from utils\.config import.*',
        '',
        content
    )
    
    # Replace engine factory
    content = re.sub(
        r'from database\.engine_factory import.*',
        'from app.services.live_trading.calculatedrisk_compat import create_db_engine',
        content
    )
    
    # Also fix relative imports to calculatedrisk plugins
    content = re.sub(
        r'from broker\.',
        'from app.services.live_trading.brokers.',
        content
    )
    
    content = re.sub(
        r'import broker\.',
        'import app.services.live_trading.brokers.',
        content
    )

    if content != original:
        with open(filepath, 'w') as f:
            f.write(content)
        print(f"Patched {filepath}")

for root, dirs, files in os.walk(PROXY_DIR):
    for file in files:
        if file.endswith('.py'):
            patch_file(os.path.join(root, file))
