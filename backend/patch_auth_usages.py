import os
import re

BROKERS_DIR = "/Users/aditya/Desktop/calculatedrisk/backend/app/services/live_trading/brokers"

def patch_file(filepath):
    with open(filepath, 'r') as f:
        content = f.read()

    original = content

    # Replace import
    content = re.sub(
        r'from app\.services\.live_trading\.brokers\._shims\.database\.auth_db import.*get_auth_token.*',
        'from app.services.live_trading.credentials.service import CredentialService',
        content
    )
    content = re.sub(
        r'from app\.services\.live_trading\.brokers\._shims\.database\.auth_db import.*get_feed_token.*',
        'from app.services.live_trading.credentials.service import CredentialService',
        content
    )

    # Patch usages: get_auth_token(user_id) -> CredentialService.load_by_exchange(user_id, "<broker>").api_key
    # We can infer broker from the file path!
    broker = filepath.split('/live_trading/brokers/')[1].split('/')[0]

    content = re.sub(
        r'get_auth_token\(\s*([^,]+)(?:,\s*bypass_cache=[^)]+)?\s*\)',
        f'CredentialService.load_by_exchange(\\1, "{broker}").api_key',
        content
    )
    content = re.sub(
        r'get_feed_token\(\s*([^,]+)(?:,\s*bypass_cache=[^)]+)?\s*\)',
        f'CredentialService.load_by_exchange(\\1, "{broker}").access_token',
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

