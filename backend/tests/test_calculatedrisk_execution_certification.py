"""
Phase 3.1 Certification: Execution Isolation and Idempotency for CalculatedRisk Brokers.
"""
import pytest
from unittest.mock import patch, MagicMock
from app.services.live_trading.brokers.calculatedrisk_adapter import CalculatedRiskAdapter
from app.services.live_trading.contracts import OrderIntent
from app.services.live_trading.factory import create_client


@pytest.fixture
def mock_calculatedrisk_client():
    return create_client({"exchange_id": "zerodha", "defaultType": "spot"})


@pytest.fixture
def order_intent():
    return OrderIntent(
        symbol="RELIANCE",
        side="BUY",
        quantity=10,
        price=2500.0,
        market_type="spot",
        client_order_id="test_client_oid",
    )


def test_calculatedrisk_adapter_place_market_order_success(mock_calculatedrisk_client, order_intent):
    adapter = CalculatedRiskAdapter(
        client=mock_calculatedrisk_client,
        exchange_id="zerodha",
        payload={},
        exchange_config={"exchange_id": "zerodha"}
    )
    with patch("app.services.live_trading.brokers.zerodha.api.order_api.place_order_api") as mock_place:
        mock_place.return_value = {"status": "success", "data": {"order_id": "12345"}}
        result = adapter.place_market_order(order_intent)
        
        mock_place.assert_called_once()
        assert result.exchange_order_id == "12345"
        assert result.exchange_id == "zerodha"


def test_calculatedrisk_adapter_place_limit_order_success(mock_calculatedrisk_client, order_intent):
    adapter = CalculatedRiskAdapter(
        client=mock_calculatedrisk_client,
        exchange_id="zerodha",
        payload={},
        exchange_config={"exchange_id": "zerodha"}
    )
    with patch("app.services.live_trading.brokers.zerodha.api.order_api.place_order_api") as mock_place:
        mock_place.return_value = {"status": "success", "data": {"order_id": "67890"}}
        result = adapter.place_limit_order(order_intent)
        
        mock_place.assert_called_once()
        assert result.exchange_order_id == "67890"


def test_calculatedrisk_adapter_cancel_order(mock_calculatedrisk_client, order_intent):
    adapter = CalculatedRiskAdapter(
        client=mock_calculatedrisk_client,
        exchange_id="zerodha",
        payload={},
        exchange_config={"exchange_id": "zerodha"}
    )
    with patch("app.services.live_trading.brokers.zerodha.api.order_api.cancel_order") as mock_cancel:
        mock_cancel.return_value = {"status": "success"}
        res = adapter.cancel_order(order_intent, order_id="67890")
        
        mock_cancel.assert_called_once()
        assert res.get("status") == "success"


def test_calculatedrisk_adapter_wait_for_fill_success(mock_calculatedrisk_client, order_intent):
    adapter = CalculatedRiskAdapter(
        client=mock_calculatedrisk_client,
        exchange_id="zerodha",
        payload={},
        exchange_config={"exchange_id": "zerodha"}
    )
    with patch("app.services.live_trading.brokers.zerodha.api.order_api.get_order_book") as mock_status:
        mock_status.return_value = {"status": "success", "data": [{"order_id": "67890", "status": "COMPLETE", "filled_quantity": 10, "average_price": 2501.0}]}
        snap = adapter.wait_for_fill(order_intent, order_id="67890", max_wait_sec=1.0)
        
        assert snap.filled_qty == 10
        assert snap.avg_price == 2501.0


def test_calculatedrisk_adapter_wait_for_fill_timeout(mock_calculatedrisk_client, order_intent):
    adapter = CalculatedRiskAdapter(
        client=mock_calculatedrisk_client,
        exchange_id="zerodha",
        payload={},
        exchange_config={"exchange_id": "zerodha"}
    )
    with patch("app.services.live_trading.brokers.zerodha.api.order_api.get_order_book") as mock_status:
        # Simulate an order still open
        mock_status.return_value = {"status": "success", "data": [{"order_id": "67890", "status": "OPEN", "filled_quantity": 0, "average_price": 0.0}]}
        # We patch time.time and time.sleep to simulate timeout quickly
        with patch("time.time", side_effect=[0, 0, 2]):
            with patch("time.sleep"):
                snap = adapter.wait_for_fill(order_intent, order_id="67890", max_wait_sec=1.0)
                assert snap.filled_qty == 0
                assert snap.raw.get("timeout") is True


def test_calculatedrisk_adapter_5xx_handling(mock_calculatedrisk_client, order_intent):
    adapter = CalculatedRiskAdapter(
        client=mock_calculatedrisk_client,
        exchange_id="zerodha",
        payload={},
        exchange_config={"exchange_id": "zerodha"}
    )
    with patch("app.services.live_trading.brokers.zerodha.api.order_api.place_order_api") as mock_place:
        mock_place.side_effect = Exception("502 Bad Gateway")
        with pytest.raises(Exception, match="502 Bad Gateway"):
            adapter.place_market_order(order_intent)


def test_calculatedrisk_dummy_client_get_positions(mock_calculatedrisk_client):
    with patch("app.services.live_trading.brokers.zerodha.api.order_api.get_positions") as mock_pos:
        mock_pos.return_value = {"status": "success", "data": [{"symbol": "RELIANCE", "qty": 100}]}
        positions = mock_calculatedrisk_client.get_positions()
        assert len(positions) == 1
        assert positions[0]["symbol"] == "RELIANCE"


def test_calculatedrisk_dummy_client_get_orders(mock_calculatedrisk_client):
    with patch("app.services.live_trading.brokers.zerodha.api.order_api.get_order_book") as mock_orders:
        mock_orders.return_value = {"status": "success", "data": [{"order_id": "123"}]}
        orders = mock_calculatedrisk_client.get_orders()
        assert len(orders) == 1
        assert orders[0]["order_id"] == "123"


def test_calculatedrisk_dummy_client_get_holdings(mock_calculatedrisk_client):
    with patch("app.services.live_trading.brokers.zerodha.api.order_api.get_holdings") as mock_holdings:
        mock_holdings.return_value = {"status": "success", "data": [{"symbol": "TCS", "qty": 50}]}
        holdings = mock_calculatedrisk_client.get_holdings()
        assert len(holdings) == 1
        assert holdings[0]["symbol"] == "TCS"


def test_calculatedrisk_dummy_client_get_funds(mock_calculatedrisk_client):
    with patch("app.services.live_trading.brokers.zerodha.api.funds.get_margin_data") as mock_funds:
        mock_funds.return_value = {"status": "success", "data": {"margin_available": 100000}}
        funds = mock_calculatedrisk_client.get_funds()
        assert funds["margin_available"] == 100000


def test_calculatedrisk_adapter_paper_guard(mock_calculatedrisk_client, order_intent):
    adapter = CalculatedRiskAdapter(
        client=mock_calculatedrisk_client,
        exchange_id="zerodha",
        payload={},
        exchange_config={"exchange_id": "zerodha", "execution_mode": "PAPER"}
    )
    with pytest.raises(RuntimeError, match="Live execution adapter called in PAPER mode"):
        adapter.place_market_order(order_intent)
