import os
from app.services.live_trading.calculatedrisk_compat import get_broker_env

# Dhan sandbox API base URL (override with env if needed)
BASE_URL = get_broker_env("DHAN_SANDBOX_BASE_URL", "https://sandbox.dhan.co").rstrip("/")


# Function to build full URL with endpoint
def get_url(endpoint):
    """
    Constructs a full URL by combining the base URL and the endpoint

    Args:
        endpoint (str): The API endpoint path (should start with '/')

    Returns:
        str: The complete URL
    """
    if not endpoint.startswith("/"):
        endpoint = "/" + endpoint
    return BASE_URL + endpoint
