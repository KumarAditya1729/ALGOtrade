import pytest
from unittest.mock import patch, MagicMock

def test_credential_isolation_tenant_separation():
    # Verify that load_credential requires both credential_id and user_id
    from app.services.quick_trade.credentials import load_credential
    
    with patch("app.services.quick_trade.credentials.get_db_connection") as mock_db:
        mock_conn = MagicMock()
        mock_db.return_value.__enter__.return_value = mock_conn
        mock_cursor = MagicMock()
        mock_conn.cursor.return_value = mock_cursor
        
        load_credential(credential_id=1, user_id=42)
        
        # Verify SQL query enforces user_id
        execute_args = mock_cursor.execute.call_args[0]
        query = execute_args[0]
        params = execute_args[1]
        
        assert "user_id = %s" in query
        assert params == (1, 42)

def test_credential_build_exchange_config():
    from app.services.quick_trade.credentials import build_exchange_config
    
    with patch("app.services.quick_trade.credentials.load_credential") as mock_load:
        mock_load.return_value = {"apiKey": "secret", "secret": "very_secret"}
        
        # Override shouldn't overwrite if it's empty
        res = build_exchange_config(1, 42, overrides={"market_type": "spot"})
        assert res["apiKey"] == "secret"
        assert res["market_type"] == "spot"
