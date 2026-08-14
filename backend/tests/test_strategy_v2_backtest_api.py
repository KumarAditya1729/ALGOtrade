import pytest
from unittest.mock import patch, MagicMock
from app.services.strategy_v2.backtest_api import submit_flow_backtest

def test_submit_flow_backtest_sync():
    flow_json = {
        "nodes": [
            {"id": "1", "type": "place_order", "data": {"symbol": "'AAPL'", "quantity": 10}}
        ]
    }
    payload = {
        "startDate": "2023-01-01",
        "endDate": "2023-12-31",
        "initialCapital": 100000
    }
    
    with patch('app.services.strategy_v2.backtest_api._run_backtest') as mock_run:
        mock_run.return_value = {"status": "success"}
        result = submit_flow_backtest(flow_json, payload, async_task=False)
        
        assert result == {"status": "success"}
        mock_run.assert_called_once()
        called_payload = mock_run.call_args[0][0]
        assert "code" in called_payload
        assert "context.set_universe(['AAPL'])" in called_payload["code"]

def test_submit_flow_backtest_async():
    flow_json = {
        "nodes": []
    }
    payload = {
        "startDate": "2023-01-01",
        "endDate": "2023-12-31"
    }
    
    with patch('app.services.strategy_v2.backtest_api.submit_job') as mock_submit:
        mock_submit.return_value = {"job_id": "job_123"}
        
        task_id = submit_flow_backtest(flow_json, payload, async_task=True)
        
        assert task_id == "job_123"
        mock_submit.assert_called_once()
        called_payload = mock_submit.call_args[1]["request_payload"]
        assert "code" in called_payload
