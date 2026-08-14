from typing import Any, Dict
from app.services.strategy_v2.flow_compiler import FlowCompiler
from app.utils.agent_jobs import submit_job
from app.routes.agent_v1.backtests import _run_backtest

def submit_flow_backtest(flow_json: Dict[str, Any], payload: Dict[str, Any], async_task: bool = False) -> Any:
    """
    Compiles an CalculatedRisk Flow JSON into Strategy V2 code and submits a backtest.
    
    Args:
        flow_json: The CalculatedRisk Flow JSON.
        payload: The payload expected by CalculatedRisk's backtest engine (startDate, endDate, initialCapital, etc).
        async_task: Whether to run via Celery or synchronously.
    
    Returns:
        If async_task=False, returns the backtest result dict.
        If async_task=True, returns the celery task ID.
    """
    compiler = FlowCompiler(flow_json)
    code = compiler.compile()
    
    payload_with_code = payload.copy()
    payload_with_code["code"] = code
    
    if async_task:
        # submit_job handles db persistence and dispatching to Celery/threads
        job = submit_job(
            user_id=int(payload_with_code.get("__user_id") or 1),
            agent_token_id=None,
            kind="backtest",
            request_payload=payload_with_code,
            runner=_run_backtest,
        )
        return job.get("job_id")
    else:
        return _run_backtest(payload_with_code)
