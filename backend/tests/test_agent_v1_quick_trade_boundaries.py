import pytest
from app.routes.agent_v1 import quick_trade
from app.utils import agent_auth

def _fake_token(paper_only: bool = False):
    return {
        "id": 1,
        "user_id": 42,
        "name": "fake",
        "scopes": "R,W,B,N,T",
        "markets": "*",
        "instruments": "*",
        "paper_only": paper_only,
        "rate_limit_per_min": 100,
        "max_order_notional": 1000,
        "max_daily_notional": 5000,
        "status": "active",
        "expires_at": None,
    }

@pytest.fixture
def mock_agent_auth(monkeypatch):
    agent_auth._schema_ready = True
    monkeypatch.setattr(agent_auth, "_touch_token_last_used", lambda *_: None)
    monkeypatch.setattr(agent_auth, "_audit", lambda *a, **kw: None)
    monkeypatch.setattr(agent_auth, "_reserve_idempotency", lambda *_: ("reserved", None))
    monkeypatch.setattr(agent_auth, "_complete_idempotency", lambda *_: None)

def test_quick_trade_live_blocked_by_env_var(client, monkeypatch, mock_agent_auth):
    monkeypatch.setattr(agent_auth, "_lookup_token", lambda raw: _fake_token(paper_only=False))
    monkeypatch.setattr(quick_trade, "_live_trading_kill_switch", lambda: False)
    
    resp = client.post(
        "/api/agent/v1/quick-trade/orders",
        headers={"Authorization": "Bearer qd_agent_fake_token", "Idempotency-Key": "test-key-1"},
        json={
            "market": "binance",
            "symbol": "BTC/USDT",
            "side": "buy",
            "qty": "0.1",
            "order_type": "market"
        }
    )
    print("RESP 1:", resp.get_json())
    assert resp.status_code == 501
    assert "Live agent trading is disabled" in resp.get_json()["message"]

def test_quick_trade_paper_only_token_enforced(client, monkeypatch, mock_agent_auth):
    monkeypatch.setattr(agent_auth, "_lookup_token", lambda raw: _fake_token(paper_only=True))
    monkeypatch.setattr(quick_trade, "_live_trading_kill_switch", lambda: True)
    
    # We mock _record_paper_order to just return a dummy result
    monkeypatch.setattr(quick_trade, "_record_paper_order", lambda **kw: {"paper": True, "status": kw.get("status")})
    monkeypatch.setattr(quick_trade, "record_completed_job", lambda **kw: None)
    
    # We mock PaperBrokerAdapter to return a dummy fill
    class FakeAdapter:
        def place_market_order(self, intent):
            class Res:
                exchange_order_id = "paper_123"
            return Res()
        def place_limit_order(self, intent):
            class Res:
                exchange_order_id = "paper_123"
            return Res()
        def wait_for_fill(self, intent, order_id):
            class Fill:
                filled_qty = 0.1
                avg_price = 50000.0
                status = "closed"
                raw = {"note": "fake"}
            return Fill()
            
    import app.services.live_trading.brokers.paper_adapter as paper_adapter
    monkeypatch.setattr(paper_adapter, "PaperBrokerAdapter", FakeAdapter)
    
    resp = client.post(
        "/api/agent/v1/quick-trade/orders",
        headers={"Authorization": "Bearer qd_agent_fake_token", "Idempotency-Key": "test-key-2"},
        json={
            "market": "binance",
            "symbol": "BTC/USDT",
            "side": "buy",
            "qty": "0.1",
            "order_type": "market"
        }
    )
    print("RESP 2:", resp.get_json())
    assert resp.status_code == 200
    data = resp.get_json()
    assert data["message"] == "paper-fill"
    assert data["data"]["paper"] is True
    assert data["data"]["status"] == "closed"
