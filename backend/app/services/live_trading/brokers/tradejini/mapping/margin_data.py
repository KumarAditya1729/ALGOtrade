# Mapping CalculatedRisk API Request https://calculatedrisk.in/docs
# Tradejini does not provide position-specific Margin Calculator API

from app.services.live_trading.calculatedrisk_compat import get_logger

logger = get_logger(__name__)


def transform_margin_positions(positions):
    """
    Transform CalculatedRisk margin position format to broker format.

    Note: Tradejini does not provide a position-specific margin calculator API.
    The available Margin API only returns account-level margin information.

    Args:
        positions: List of positions in CalculatedRisk format

    Raises:
        NotImplementedError: Tradejini does not support position-specific margin calculator API
    """
    raise NotImplementedError("Tradejini does not support position-specific margin calculator API")


def parse_margin_response(response_data):
    """
    Parse broker margin calculator response to CalculatedRisk standard format.

    Note: Tradejini does not provide a position-specific margin calculator API.
    The available Margin API only returns account-level margin information.

    Args:
        response_data: Raw response from broker margin calculator API

    Raises:
        NotImplementedError: Tradejini does not support position-specific margin calculator API
    """
    raise NotImplementedError("Tradejini does not support position-specific margin calculator API")
