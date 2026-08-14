import os
os.environ["DATABASE_URL"] = "postgresql://user:pass@localhost:5432/mockdb"
os.environ["AGENT_LIVE_TRADING_ENABLED"] = "true"
import pytest
from unittest.mock import MagicMock
from app.services.pending_order_worker import PendingOrderWorker
from app.services.live_trading.contracts import LiveOrderResult, FillSnapshot
import app.services.pending_order_worker as worker_module
class CalculatedRiskDummyClient:
    def __init__(self):
        self.place_calls = 0
        self.lookup_calls = 0
        self.should_timeout_place = False
        self.lookup_result = None
        self.lookup_exception = None
    def place_market_order(self, intent):
        self.place_calls += 1
        if self.should_timeout_place:
            raise TimeoutError("Simulated network timeout during placement")
        return LiveOrderResult(
            exchange_id="calculatedrisk",
            exchange_order_id="broker_order_123",
            filled=0.0,
            avg_price=0.0,
            raw={"id": "broker_order_123"}
        )
        
    def wait_for_fill(self, intent, order_id, max_wait_sec):
        return FillSnapshot(
            filled_qty=intent.quantity,
            avg_price=10.0,
            status="filled",
            raw={"id": "broker_order_123", "status": "filled"}
        )
    def find_order_by_client_id(self, client_order_id):
        self.lookup_calls += 1
        if self.lookup_exception:
            raise self.lookup_exception
        return self.lookup_result
@pytest.fixture(autouse=True)
def mock_calculatedrisk_adapter_methods(monkeypatch):
    monkeypatch.setattr("app.services.live_trading.brokers.calculatedrisk_adapter.CalculatedRiskAdapter.find_order_by_client_id", lambda self, cid: self.client.find_order_by_client_id(cid), raising=False)
    monkeypatch.setattr("app.services.live_trading.brokers.calculatedrisk_adapter.CalculatedRiskAdapter.place_market_order", lambda self, intent: self.client.place_market_order(intent), raising=False)
    monkeypatch.setattr("app.services.live_trading.brokers.calculatedrisk_adapter.CalculatedRiskAdapter.wait_for_fill", lambda self, intent, order_id, max_wait_sec: self.client.wait_for_fill(intent, order_id, max_wait_sec), raising=False)
@pytest.fixture
def mock_conn(monkeypatch):
    monkeypatch.setattr("psycopg2.pool.ThreadedConnectionPool", MagicMock(), raising=False)
    monkeypatch.setattr("psycopg2.connect", MagicMock(), raising=False)
    conn = MagicMock()
    cursor = MagicMock()
    
    cursor.fetchone.return_value = {"status": "pending"}
    cursor.fetchall.return_value = []
    
    conn.cursor.return_value = cursor
    conn.__enter__.return_value = conn
    cursor.__enter__.return_value = cursor
    
    monkeypatch.setattr("app.utils.db_postgres.get_pg_connection", lambda: conn, raising=False)
    monkeypatch.setattr("app.utils.db_postgres._acquire_conn_with_wait", lambda *a: conn, raising=False)
    monkeypatch.setattr("app.utils.db.get_db_connection", lambda: conn, raising=False)
    monkeypatch.setattr("app.services.pending_order_worker.get_db_connection", lambda: conn, raising=False)
    return conn
@pytest.fixture
def worker(mock_conn, monkeypatch):
    monkeypatch.setattr("app.services.pending_order_worker.load_strategy_configs", lambda *a, **kw: {"exchange_id": "calculatedrisk", "execution_mode": "live", "market_category": "USStock"}, raising=False)
    monkeypatch.setattr("app.services.pending_order_worker.resolve_exchange_config", lambda *a, **kw: {"exchange_id": "calculatedrisk"}, raising=False)
    monkeypatch.setattr("app.services.broker_market_policy.validate_strategy_config", lambda *a, **kw: None, raising=False)
    monkeypatch.setattr("app.services.pending_orders.live_order_support.validate_strategy_config", lambda *a, **kw: None, raising=False)
    monkeypatch.setattr("app.services.live_trading.position_query.query_exchange_position_size", lambda *a, **kw: 0.0, raising=False)
    monkeypatch.setattr("app.services.pending_order_worker.evaluate_entry_position_guard", lambda *a, **kw: None, raising=False)
    monkeypatch.setattr("app.services.pending_order_worker.supports_position_coexistence", lambda *a, **kw: False, raising=False)
    monkeypatch.setattr("app.services.pending_order_worker.dispatch_reconciliation", lambda *a, **kw: None, raising=False)
    monkeypatch.setattr("app.services.live_trading.account_risk.account_risk_snapshot", lambda *a, **kw: {"allowed": True, "violations": []}, raising=False)
    monkeypatch.setattr("app.services.live_trading.account_risk.account_risk_limits", lambda *a, **kw: {}, raising=False)
    monkeypatch.setattr("app.services.live_trading.account_configuration.configure_derivatives_account", lambda *a, **kw: {"status": "ok"}, raising=False)
    monkeypatch.setattr("app.services.live_trading.credentials.service.CredentialService.load_by_exchange", lambda *a, **kw: {"broker_id": "flattrade"}, raising=False)
    w = PendingOrderWorker(poll_interval_sec=0.1, batch_size=1)
    w._mark_sent = MagicMock()
    
    def my_mark_failed(order_id, error):
        if error == "broker_timeout":
            return
        if "Generic reconciliation lookup failed: Simulated network timeout" in error:
            raise RuntimeError(error)
        raise RuntimeError(f"worker failed deliberately for debugging: {error}")
        
    w._mark_failed = MagicMock(side_effect=my_mark_failed)
    w._execute_reduce_only_guard = MagicMock(return_value=10.0)
    w._sync_positions_best_effort = MagicMock()
    
    return w

def test_timeout_after_broker_acceptance(worker, monkeypatch):
    client = CalculatedRiskDummyClient()
    monkeypatch.setattr("app.services.pending_order_worker.create_client", lambda *a, **kw: client)
    order_row = {
        "id": 100, "strategy_id": 1, "symbol": "AAPL", "signal_type": "open_long",
        "amount": 10.0, "order_type": "market", "exchange_id": "calculatedrisk", "payload": {"exchange_id": "calculatedrisk"}, "user_id": 1
    }
    payload = {"exchange_id": "calculatedrisk", "order_type": "market", "amount": 10.0}
    
    # Attempt 1: Network timeout during placement (but broker accepted it)
    client.should_timeout_place = True
    monkeypatch.setattr(worker, "_log_execution_attempt_start", lambda o, c: False)
    monkeypatch.setattr(worker, "_log_execution_attempt_end", MagicMock())
    
    worker._execute_live_order(order_id=100, order_row=order_row, payload=payload)
    assert client.place_calls == 1
    
    # Attempt 2: Worker retries. Layer 3 reconciliation identifies existing attempt.
    client.should_timeout_place = False
    client.lookup_result = {"id": "broker_order_123"}
    monkeypatch.setattr(worker, "_log_execution_attempt_start", lambda o, c: True)
    
    worker._execute_live_order(order_id=100, order_row=order_row, payload=payload)
    
    # place_calls must still be 1! (0 additional submissions)
    print(f"\n[test] place_calls={client.place_calls}")
    assert client.place_calls == 1

def test_timeout_before_broker_acceptance(worker, monkeypatch):
    client = CalculatedRiskDummyClient()
    monkeypatch.setattr("app.services.pending_order_worker.create_client", lambda *a, **kw: client)
    order_row = {
        "id": 101, "strategy_id": 1, "symbol": "AAPL", "signal_type": "open_long",
        "amount": 10.0, "order_type": "market", "exchange_id": "calculatedrisk", "payload": {"exchange_id": "calculatedrisk"}, "user_id": 1
    }
    payload = {"exchange_id": "calculatedrisk"}
    
    # Attempt 1: times out BEFORE broker accepts it.
    client.should_timeout_place = True
    monkeypatch.setattr(worker, "_log_execution_attempt_start", lambda o, c: False)
    monkeypatch.setattr(worker, "_log_execution_attempt_end", MagicMock())
    
    worker._execute_live_order(order_id=101, order_row=order_row, payload=payload)
    assert client.place_calls == 1
    
    # Attempt 2: Reconciliation lookup returns None. We must resubmit.
    client.should_timeout_place = False
    client.lookup_result = None
    monkeypatch.setattr(worker, "_log_execution_attempt_start", lambda o, c: True)
    
    worker._execute_live_order(order_id=101, order_row=order_row, payload=payload)
    
    assert client.lookup_calls == 1
    # Exactly one additional retry submission -> place_calls = 2
    print(f"\n[test] place_calls={client.place_calls}")
    assert client.place_calls == 2

def test_reconciliation_failure_does_not_resubmit(worker, monkeypatch):
    client = CalculatedRiskDummyClient()
    monkeypatch.setattr("app.services.pending_order_worker.create_client", lambda *a, **kw: client)
    order_row = {
        "id": 102, "strategy_id": 1, "symbol": "AAPL", "signal_type": "open_long",
        "amount": 10.0, "order_type": "market", "exchange_id": "calculatedrisk", "payload": {"exchange_id": "calculatedrisk"}, "user_id": 1
    }
    payload = {"exchange_id": "calculatedrisk"}
    monkeypatch.setattr("app.services.live_trading.brokers.calculatedrisk_adapter.CalculatedRiskAdapter.find_order_by_client_id", lambda self, cid: self.client.find_order_by_client_id(cid)) 
    monkeypatch.setattr("app.services.live_trading.brokers.calculatedrisk_adapter.CalculatedRiskAdapter.place_market_order", lambda self, intent: self.client.place_market_order(intent)) 
    
    # Attempt 1: times out
    client.should_timeout_place = True
    monkeypatch.setattr(worker, "_log_execution_attempt_start", lambda o, c: False)
    monkeypatch.setattr(worker, "_log_execution_attempt_end", MagicMock())
    
    worker._execute_live_order(order_id=102, order_row=order_row, payload=payload)
    assert client.place_calls == 1
    
    # Attempt 2: Reconciliation lookup fails entirely (API down)
    client.should_timeout_place = False
    client.lookup_exception = TimeoutError("Simulated network timeout")
    monkeypatch.setattr(worker, "_log_execution_attempt_start", lambda o, c: True)
    
    with pytest.raises(RuntimeError, match="Generic reconciliation lookup failed: Simulated network timeout"):
        worker._execute_live_order(order_id=102, order_row=order_row, payload=payload)
    
    assert client.lookup_calls == 1
    # 0 additional submissions (total remains 1 from Attempt 1)
    print(f"\n[test] place_calls={client.place_calls}")
    assert client.place_calls == 1
def test_max_attempts_dead_letters(worker, mock_conn):
    mock_cursor = mock_conn.cursor.return_value
    worker._stale_processing_sec = 10
    worker._fetch_pending_orders(limit=10)
    executed_sqls = [call[0][0] for call in mock_cursor.execute.call_args_list]
    dead_letter_sql = next((sql for sql in executed_sqls if "dispatch_note = 'dead_letter_max_attempts'" in sql), None)
    assert dead_letter_sql is not None, "Dead-lettering query not found in _fetch_pending_orders"
    assert "attempts >= max_attempts" in dead_letter_sql
    assert "status = 'failed'" in dead_letter_sql
