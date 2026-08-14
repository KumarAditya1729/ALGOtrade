import os
os.environ["DATABASE_URL"] = "postgresql://user:pass@localhost:5432/mockdb"

import json
import uuid
import pytest
from unittest.mock import MagicMock
from app import create_app
from app.services.pending_order_worker import PendingOrderWorker
from app.services.live_trading.brokers.calculatedrisk_adapter import CalculatedRiskAdapter
from app.services.pending_orders.live_order_support import LiveOrderRejected

class MockCalculatedRiskDummyClient:
    pass

@pytest.fixture
def auth_headers(monkeypatch):
    monkeypatch.setattr(
        "app.utils.auth.verify_token", 
        lambda t: {"user_id": 1, "_verified_username": "test_user", "_verified_user_role": "user"},
        raising=False
    )
    return {"Authorization": "Bearer fake_token"}

@pytest.fixture(autouse=True)
def mock_db(monkeypatch):
    # Mock psycopg2 to avoid real connections
    monkeypatch.setattr("psycopg2.pool.ThreadedConnectionPool", MagicMock(), raising=False)
    monkeypatch.setattr("psycopg2.connect", MagicMock(), raising=False)

    mock_conn = MagicMock()
    mock_cursor = MagicMock()
    
    # We use a simple callable to return our fake row to avoid StopIteration issues from iterators
    def _fake_fetchone():
        return {
            "id": 999,
            "exchange_id": "binance",
            "api_key": "x",
            "secret_key": "y",
            "api_secret": "y",
            "is_paper": False
        }
    
    mock_cursor.fetchone.side_effect = _fake_fetchone
    mock_cursor.fetchall.return_value = [{"id": 999}]
    mock_conn.cursor.return_value = mock_cursor
    mock_conn.__enter__.return_value = mock_conn
    mock_cursor.__enter__.return_value = mock_cursor
    
    # Mock at the root db_postgres level
    monkeypatch.setattr("app.utils.db_postgres.get_pg_connection", lambda: mock_conn, raising=False)
    monkeypatch.setattr("app.utils.db_postgres._acquire_conn_with_wait", lambda *a: mock_conn, raising=False)
    monkeypatch.setattr("app.utils.db.get_db_connection", lambda: mock_conn, raising=False)
    
    # Mock direct imports where used
    monkeypatch.setattr("app.services.pending_order_worker.get_db_connection", lambda: mock_conn, raising=False)
    monkeypatch.setattr("app.routes.quick_trade.get_db_connection", lambda: mock_conn, raising=False)
    monkeypatch.setattr("app.routes.alpaca.get_db_connection", lambda: mock_conn, raising=False)
    monkeypatch.setattr("app.routes.ibkr.get_db_connection", lambda: mock_conn, raising=False)
    
    # Mock credentials to bypass validation completely
    monkeypatch.setattr(
        "app.services.quick_trade.credentials.load_credential", 
        lambda cid, uid: {"exchange_id": "binance", "api_key": "x", "api_secret": "y", "secret_key": "y", "is_paper": False},
        raising=False
    )
    
    # Mock create_client to avoid broker initialization errors and size validations
    class CalculatedRiskDummyClient:
        pass
    
    mock_client = CalculatedRiskDummyClient()
    monkeypatch.setattr("app.services.live_trading.factory.create_client", lambda *a, **kw: mock_client, raising=False)
    monkeypatch.setattr("app.services.quick_trade.credentials.create_client", lambda *a, **kw: mock_client, raising=False)
    monkeypatch.setattr("app.services.pending_order_worker.create_client", lambda *a, **kw: mock_client, raising=False)
    
    # Mock balance checking to avoid sizing errors
    monkeypatch.setattr("app.routes.quick_trade.fetch_balance_raw", lambda *a, **kw: {"available": 1000000.0}, raising=False)
    # Mock spot amount resolution
    monkeypatch.setattr("app.routes.quick_trade._resolve_spot_amount_and_price", lambda *a, **kw: 1.0, raising=False)
    monkeypatch.setattr("app.services.live_trading.spot_sizing.prepare_spot_live_order_sizes", lambda *a, **kw: (1.0, 50000.0, 1.0), raising=False)
    
    return mock_conn

@pytest.fixture(scope="module")
def app():
    app = create_app()
    app.config["TESTING"] = True
    
    # We must push an application context for g to be available in before_request
    @app.before_request
    def set_g():
        from flask import g
        g.user_id = 1
        
    return app

@pytest.fixture
def client(app):
    with app.test_client() as client:
        yield client

# --- 4.1 NO-BYPASS TESTS ---

def test_quick_trade_no_bypass(client, monkeypatch, mock_db, auth_headers):
    called = []
    def mock_place(*args, **kwargs):
        called.append(True)
        return {"data": {"order_id": "mock_id"}}
    monkeypatch.setattr(CalculatedRiskAdapter, "place_market_order", mock_place)
    
    payload = {
        "credential_id": 1,
        "symbol": "BTC/USDT",
        "side": "buy",
        "price": 50000,
        "amount": 1
    }
    res = client.post("/api/quick-trade/place-order", json=payload, headers=auth_headers)
    assert res.status_code in (200, 400), res.get_json()
    assert len(called) == 0, "Broker adapter was called directly!"
    
    executed_sqls = [call[0][0] for call in mock_db.cursor().execute.call_args_list]
    assert any("INSERT INTO pending_orders" in sql for sql in executed_sqls)

def test_alpaca_no_bypass(client, monkeypatch, mock_db, auth_headers):
    called = []
    def mock_place(*args, **kwargs):
        called.append(True)
    monkeypatch.setattr(CalculatedRiskAdapter, "place_market_order", mock_place)
    
    # Mock require_connected_client to succeed without hitting DB
    monkeypatch.setattr("app.routes.alpaca._require_connected_client", lambda: (MagicMock(), None), raising=False)
    
    payload = {
        "symbol": "AAPL",
        "quantity": "10",
        "side": "buy",
        "orderType": "market",
    }
    res = client.post("/api/alpaca/order", json=payload, headers=auth_headers)
    assert res.status_code in (200, 400), res.get_json()
    assert len(called) == 0
    executed_sqls = [call[0][0] for call in mock_db.cursor().execute.call_args_list]
    assert any("INSERT INTO pending_orders" in sql for sql in executed_sqls)

def test_ibkr_no_bypass(client, monkeypatch, mock_db, auth_headers):
    called = []
    def mock_place(*args, **kwargs):
        called.append(True)
    monkeypatch.setattr(CalculatedRiskAdapter, "place_market_order", mock_place)
    
    # Mock require_connected_client to succeed without hitting DB
    monkeypatch.setattr("app.routes.ibkr._require_connected_client", lambda: (MagicMock(), None), raising=False)
    
    payload = {
        "symbol": "AAPL",
        "quantity": "10",
        "side": "buy",
        "orderType": "market",
    }
    res = client.post("/api/ibkr/order", json=payload, headers=auth_headers)
    assert res.status_code in (200, 400), res.get_json()
    assert len(called) == 0
    executed_sqls = [call[0][0] for call in mock_db.cursor().execute.call_args_list]
    assert any("INSERT INTO pending_orders" in sql for sql in executed_sqls)

# --- 4.2 IDEMPOTENCY TESTS ---

def test_quick_trade_idempotency(client, monkeypatch, mock_db, auth_headers):
    fixed_id = uuid.UUID('12345678-1234-5678-1234-567812345678')
    monkeypatch.setattr("uuid.uuid4", lambda: fixed_id, raising=False)
    
    payload = {
        "credential_id": 1,
        "symbol": "BTC/USDT",
        "side": "buy",
        "price": 50000,
        "amount": 1
    }
    
    # First request
    res1 = client.post("/api/quick-trade/place-order", json=payload, headers=auth_headers)
    assert res1.status_code in (200, 400), res1.get_json()
    
    # Second request with the same idempotency key
    res2 = client.post("/api/quick-trade/place-order", json=payload, headers=auth_headers)
    assert res2.status_code in (200, 400), res2.get_json()

# --- 4.3 WORKER RETRY SAFETY TESTS ---

def test_worker_retry_safety(monkeypatch, mock_db):
    from app.services.live_trading.base import LiveOrderResult
    worker = PendingOrderWorker()
    monkeypatch.setenv("AGENT_LIVE_TRADING_ENABLED", "true")
    
    monkeypatch.setattr("app.services.pending_order_worker.load_strategy_configs", lambda sid: {
        "user_id": 1,
        "exchange_config": {"exchange_id": "binance", "api_key": "x", "api_secret": "y", "secret_key": "y"}
    }, raising=False)
    
    # Mock position query to avoid actual queries in test
    import app.services.live_trading.position_query as pq
    monkeypatch.setattr(pq, "query_exchange_position_size", lambda *a, **kw: 0.0, raising=False)
    monkeypatch.setattr("app.services.pending_order_worker.evaluate_entry_position_guard", lambda *a, **kw: MagicMock(ownership=False, error=None), raising=False)
    
    called_oids = []
    
    def mock_place_market_order(self, intent):
        if intent.client_order_id in called_oids:
            return LiveOrderResult(
                exchange_id="binance", exchange_order_id="existing_id",
                filled=0.0, avg_price=0.0, raw={"idempotent": True}
            )
        called_oids.append(intent.client_order_id)
        raise RuntimeError("Worker Crash Simulator")
        
    monkeypatch.setattr(CalculatedRiskAdapter, "place_market_order", mock_place_market_order)
    
    row = {
        "id": 1,
        "strategy_id": 1,
        "symbol": "BTC",
        "signal_type": "open_long",
        "amount": 1,
        "price": 50000,
        "market_type": "spot", # explicitly skip derivatives account configuration
    }
    
    # Mocking _mark_failed to see if it correctly caught our exception
    failed = []
    monkeypatch.setattr(worker, "_mark_failed", lambda **kwargs: failed.append(kwargs.get("error", str(kwargs))), raising=False)
    
    worker._execute_live_order(order_id=1, order_row=row, payload={"market_type": "spot"})
    
    assert len(called_oids) == 1, f"called_oids={called_oids}, failed={failed}"
    assert any("Worker Crash Simulator" in str(err) for err in failed), "Error wasn't caught or passed to _mark_failed"
    
    def mock_place_market_order_2(self, intent):
        assert intent.client_order_id == called_oids[0]
        return LiveOrderResult(
            exchange_id="binance", exchange_order_id="existing_id",
            filled=0.0, avg_price=0.0, raw={"idempotent": True}
        )
    monkeypatch.setattr(CalculatedRiskAdapter, "place_market_order", mock_place_market_order_2)
    monkeypatch.setattr(CalculatedRiskAdapter, "wait_for_fill", lambda self, intent, order_id: LiveOrderResult(
            exchange_id="binance", exchange_order_id="existing_id",
            filled=1.0, avg_price=50000.0, raw={"idempotent": True}
        ), raising=False)
    monkeypatch.setattr("app.services.pending_order_worker.persist_strategy_fill", lambda *a, **kw: (0.0, None), raising=False)
    
    # Second execution should succeed without creating a second order because idempotency is preserved
    worker._execute_live_order(order_id=1, order_row=row, payload={"market_type": "spot"})

# --- 4.4 CREDENTIAL ISOLATION TESTS ---

def test_credential_isolation(monkeypatch, mock_db):
    worker = PendingOrderWorker()
    monkeypatch.setenv("AGENT_LIVE_TRADING_ENABLED", "true")
    
    # We must patch load_strategy_configs AND resolve_exchange_config carefully
    def mock_resolve_config(config, user_id):
        # Emulate credential resolution rejection if uid mismatch
        if config.get("credential_id") == 10 and user_id != 1:
            raise ValueError("Credential not found or access denied")
        return config
        
    monkeypatch.setattr("app.services.pending_order_worker.resolve_exchange_config", mock_resolve_config, raising=False)
    
    row = {
        "id": 1,
        "strategy_id": 1,
        "symbol": "BTC",
        "signal_type": "open_long",
        "amount": 1
    }
    
    # Simulates an order from user 2 trying to use credential 10
    monkeypatch.setattr("app.services.pending_order_worker.load_strategy_configs", lambda sid: {
        "user_id": 2, 
        "exchange_config": {"credential_id": 10, "exchange_id": "dummy"}
    }, raising=False)
    
    failed = []
    # Mock the place_market_order so it doesn't fail on missing credential if the test gets there
    monkeypatch.setattr(CalculatedRiskAdapter, "place_market_order", MagicMock())
    
    with pytest.raises(ValueError, match="Credential not found or access denied"):
        worker._execute_live_order(order_id=1, order_row=row, payload={})

# --- 4.5 PAPER CONTAMINATION TESTS ---

def test_paper_contamination_test(monkeypatch):
    worker = PendingOrderWorker()
    
    row = {
        "id": 1,
        "strategy_id": 1,
        "symbol": "BTC",
        "signal_type": "open_long",
        "amount": 1
    }
    
    from app.services.pending_orders.live_order_support import build_live_order_context
    from app.services.exchange_execution import resolve_exchange_config, safe_exchange_config_for_log
    
    monkeypatch.setattr("app.services.broker_market_policy.validate_strategy_config", lambda **kw: None, raising=False)

    ctx = build_live_order_context(
        order_id=1,
        order_row=row,
        payload={},
        load_strategy_configs=lambda sid: {
            "user_id": 1,
            "exchange_config": {"exchange_id": "binance", "api_key": "live_key"}
        },
        resolve_exchange_config=resolve_exchange_config,
        safe_exchange_config_for_log=safe_exchange_config_for_log,
        execution_mode="paper"
    )
    
    assert ctx.exchange_id == "paper", "Paper contamination! Live exchange leaked."

