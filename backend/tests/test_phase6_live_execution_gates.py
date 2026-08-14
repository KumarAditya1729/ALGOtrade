import os
import pytest
from app.services.pending_order_worker import PendingOrderWorker

class MockContext:
    def __init__(self, exchange_id):
        self.strategy_id = 1
        self.signal_type = "open_long"
        self.symbol = "BTC/USDT"
        self.amount = 1.0
        self.cfg = {}
        self.exchange_config = {}
        self.safe_exchange_config = {}
        self.exchange_id = exchange_id
        self.market_category = "Crypto"
        self.market_type = "spot"
        self.client_order_id = "test"

@pytest.fixture
def mock_worker():
    return PendingOrderWorker()

def test_paper_execution_invariant_rejects_live(mock_worker, monkeypatch):
    """Ensure _execute_paper_order rejects if exchange_id != paper"""
    # Patched for local import in _execute_paper_order
    monkeypatch.setattr(
        "app.services.pending_orders.live_order_support.build_live_order_context",
        lambda **kwargs: MockContext(exchange_id="binance")
    )
    
    # We intercept _mark_failed to check if it was called
    failed_reasons = []
    monkeypatch.setattr(mock_worker, "_mark_failed", lambda order_id, error: failed_reasons.append(error))
    
    mock_worker._execute_paper_order(order_id=1, order_row={"strategy_id": 1}, payload={})
    
    assert len(failed_reasons) == 1
    assert "Execution mode invariant violated" in failed_reasons[0]
    assert "live exchange config" in failed_reasons[0]

def test_live_execution_invariant_rejects_paper(mock_worker, monkeypatch):
    """Ensure _execute_live_order rejects if exchange_id == paper"""
    # Patched for module level import in _execute_live_order
    monkeypatch.setattr(
        "app.services.pending_order_worker.build_live_order_context",
        lambda **kwargs: MockContext(exchange_id="paper")
    )
    
    # Enable live trading to ensure it doesn't fail on that
    monkeypatch.setenv("AGENT_LIVE_TRADING_ENABLED", "true")
    
    failed_reasons = []
    monkeypatch.setattr(mock_worker, "_mark_failed", lambda order_id, error: failed_reasons.append(error))
    
    mock_worker._execute_live_order(order_id=1, order_row={"strategy_id": 1}, payload={})
    
    assert len(failed_reasons) == 1
    assert "Execution mode invariant violated" in failed_reasons[0]
    assert "paper exchange config" in failed_reasons[0]

def test_live_trading_kill_switch(mock_worker, monkeypatch):
    """Ensure _execute_live_order rejects if AGENT_LIVE_TRADING_ENABLED is false"""
    monkeypatch.setattr(
        "app.services.pending_order_worker.build_live_order_context",
        lambda **kwargs: MockContext(exchange_id="binance")
    )
    
    monkeypatch.setenv("AGENT_LIVE_TRADING_ENABLED", "false")
    
    failed_reasons = []
    monkeypatch.setattr(mock_worker, "_mark_failed", lambda order_id, error: failed_reasons.append(error))
    
    mock_worker._execute_live_order(order_id=1, order_row={"strategy_id": 1}, payload={})
    
    assert len(failed_reasons) == 1
    assert "agentLiveTradingDisabled" in failed_reasons[0]

