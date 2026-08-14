# Mapping CalculatedRisk API Request https://calculatedrisk.in/docs
# FivePaisaXTS does not provide Margin Calculator API

from app.services.live_trading.calculatedrisk_compat import get_logger

logger = get_logger(__name__)


def transform_margin_positions(positions):
    """
    Transform CalculatedRisk margin position format to broker format.

    Note: FivePaisaXTS does not provide a margin calculator API.

    Args:
        positions: List of positions in CalculatedRisk format

    Raises:
        NotImplementedError: FivePaisaXTS does not support margin calculator API
    """
    raise NotImplementedError("FivePaisaXTS does not support margin calculator API")


def parse_margin_response(response_data):
    """
    Parse broker margin calculator response to CalculatedRisk standard format.

    Note: FivePaisaXTS does not provide a margin calculator API.

    Args:
        response_data: Raw response from broker margin calculator API

    Raises:
        NotImplementedError: FivePaisaXTS does not support margin calculator API
    """
    raise NotImplementedError("FivePaisaXTS does not support margin calculator API")
