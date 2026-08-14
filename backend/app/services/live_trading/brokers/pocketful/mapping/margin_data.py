# Mapping CalculatedRisk API Request https://calculatedrisk.in/docs
# Pocketful does not provide Margin Calculator API

from app.services.live_trading.calculatedrisk_compat import get_logger

logger = get_logger(__name__)


def transform_margin_positions(positions):
    """
    Transform CalculatedRisk margin position format to broker format.

    Note: Pocketful does not provide a margin calculator API.

    Args:
        positions: List of positions in CalculatedRisk format

    Raises:
        NotImplementedError: Pocketful does not support margin calculator API
    """
    raise NotImplementedError("Pocketful does not support margin calculator API")


def parse_margin_response(response_data):
    """
    Parse broker margin calculator response to CalculatedRisk standard format.

    Note: Pocketful does not provide a margin calculator API.

    Args:
        response_data: Raw response from broker margin calculator API

    Raises:
        NotImplementedError: Pocketful does not support margin calculator API
    """
    raise NotImplementedError("Pocketful does not support margin calculator API")
