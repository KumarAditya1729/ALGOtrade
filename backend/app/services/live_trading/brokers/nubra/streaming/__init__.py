"""
Nubra WebSocket streaming module for CalculatedRisk.

This module provides WebSocket integration with Nubra's market data streaming API,
following the CalculatedRisk WebSocket proxy architecture.
"""

from .nubra_adapter import NubraWebSocketAdapter

__all__ = ["NubraWebSocketAdapter"]
