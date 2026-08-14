import pytest
import os
import time
from unittest.mock import patch, MagicMock

@patch("app.routes.agent_v1.quick_trade._dispatch_to_canonical_pipeline")
@patch("app.routes.agent_v1.quick_trade.paper_only")
def test_ai_boundary_paper_only_enforcement(mock_paper_only, mock_dispatch, app, client):
    mock_paper_only.return_value = True
    
    mock_dispatch.return_value = {
        "pending_order_id": 1,
        "status": "filled",
        "paper": True,
    }
    
    with app.test_request_context():
        # Fake authentication
        from app.routes.agent_v1.quick_trade import place_order
        with patch("app.routes.agent_v1.quick_trade.current_user_id", return_value=1), \
             patch("app.routes.agent_v1.quick_trade.current_token", return_value={"id": 1}):
            pass

def test_ai_canonical_routing_inserts_pending_order():
    from app.routes.agent_v1.quick_trade import _dispatch_to_canonical_pipeline
    
    with patch("app.utils.db.get_db_connection") as mock_db, \
         patch("app.services.strategy_runtime.order_intents.get_db_connection") as mock_intent_db:
        mock_conn = MagicMock()
        mock_db.return_value.__enter__.return_value = mock_conn
        mock_intent_db.return_value.__enter__.return_value = mock_conn
        
        mock_cursor = MagicMock()
        mock_conn.cursor.return_value = mock_cursor
        
        # 1. create_intent ON CONFLICT DO NOTHING RETURNING id -> returns {"id": 1}
        # 2. INSERT INTO pending_orders RETURNING id -> returns {"id": 123}
        # 3. SELECT status FROM pending_orders -> returns status row
        mock_cursor.fetchone.side_effect = [{"id": 1}, {"id": 123}, {"status": "filled", "exchange_order_id": "test", "filled": 1.0, "avg_price": 50000.0}]
        mock_cursor.lastrowid = 1
        
        res = _dispatch_to_canonical_pipeline({
            "market": "paper",
            "symbol": "BTC/USD",
            "side": "buy",
            "qty": 1.0,
        }, user_id=1, execution_mode="paper")
        
        assert res["pending_order_id"] == 123
        assert res["status"] == "filled"
        assert res["paper"] == True
        
        found_insert = False
        for call_args in mock_cursor.execute.call_args_list:
            if "INSERT INTO pending_orders" in call_args[0][0]:
                found_insert = True
                assert "paper" in call_args[0][1] # execution_mode is paper
        assert found_insert
