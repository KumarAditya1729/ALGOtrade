"""
Zerodha WebSocket streaming module for CalculatedRisk.

This module provides WebSocket integration with Zerodha's market data streaming API,
following the CalculatedRisk WebSocket proxy architecture.
"""

from .zerodha_adapter import ZerodhaWebSocketAdapter

__all__ = ["ZerodhaWebSocketAdapter"]
