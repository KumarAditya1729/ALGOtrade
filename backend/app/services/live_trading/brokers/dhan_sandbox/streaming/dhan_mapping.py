"""
Mapping utilities for Dhan broker integration.
Provides exchange code mappings between CalculatedRisk and Dhan formats.
"""

from typing import Dict

# Exchange code mappings
# CalculatedRisk exchange code -> Dhan exchange code
OPENALGO_TO_DHAN_EXCHANGE = {
    "NSE": "NSE_EQ",
    "BSE": "BSE_EQ",
    "NFO": "NSE_FNO",
    "BFO": "BSE_FNO",
    "CDS": "NSE_CURRENCY",
    "BCD": "BSE_CURRENCY",
    "MCX": "MCX_COMM",
    "NSE_INDEX": "IDX_I",
    "BSE_INDEX": "IDX_I",
}

# Dhan exchange code -> CalculatedRisk exchange code
DHAN_TO_OPENALGO_EXCHANGE = {v: k for k, v in OPENALGO_TO_DHAN_EXCHANGE.items()}


def get_dhan_exchange(calculatedrisk_exchange: str) -> str:
    """
    Convert CalculatedRisk exchange code to Dhan exchange code.

    Args:
        calculatedrisk_exchange (str): Exchange code in CalculatedRisk format

    Returns:
        str: Exchange code in Dhan format
    """
    return OPENALGO_TO_DHAN_EXCHANGE.get(calculatedrisk_exchange, calculatedrisk_exchange)


def get_calculatedrisk_exchange(dhan_exchange: str) -> str:
    """
    Convert Dhan exchange code to CalculatedRisk exchange code.

    Args:
        dhan_exchange (str): Exchange code in Dhan format

    Returns:
        str: Exchange code in CalculatedRisk format
    """
    return DHAN_TO_OPENALGO_EXCHANGE.get(dhan_exchange, dhan_exchange)
