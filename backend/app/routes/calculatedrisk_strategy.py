from flask import Blueprint, jsonify, request
from app.services.live_trading.calculatedrisk_compat import get_logger
from app.utils.agent_jobs import submit_job, get_job_for_worker
from app.routes.agent_v1.backtests import _run_backtest

logger = get_logger(__name__)

calculatedrisk_strategy_bp = Blueprint("calculatedrisk_strategy", __name__, url_prefix="")

@calculatedrisk_strategy_bp.route("/python/execute", methods=["POST"])
def execute_python_strategy():
    """Execute a Python strategy by dispatching to the CalculatedRisk celery worker."""
    data = request.get_json(silent=True) or {}
    logger.info("Dispatching python strategy to Celery worker")
    
    # We must provide a runner for local fallback testing
    job = submit_job(
        user_id=1,  # Assuming a default user
        agent_token_id=0,
        kind="python_strategy",
        request_payload=data,
        runner=_run_backtest,
    )
    return jsonify({"status": "success", "message": "Strategy dispatched to CalculatedRisk worker", "task_id": job.get("job_id")})

@calculatedrisk_strategy_bp.route("/python/status", methods=["GET"])
def python_strategy_status():
    """Get the status of a Python strategy."""
    task_id = request.args.get("task_id")
    job = get_job_for_worker(task_id) if task_id else None
    if not job:
        return jsonify({"status": "error", "message": "Job not found"}), 404
        
    return jsonify({"status": "success", "task_status": job.get("status"), "task_id": task_id, "result": job.get("result")})

@calculatedrisk_strategy_bp.route("/flow/execute", methods=["POST"])
def execute_flow_strategy():
    """Execute a Flow strategy by dispatching to the CalculatedRisk celery worker."""
    data = request.get_json(silent=True) or {}
    logger.info("Dispatching flow strategy to Celery worker")
    
    def _flow_runner(payload, on_progress=None):
        from app.services.strategy_v2.flow_compiler import FlowCompiler
        compiler = FlowCompiler(payload.get("flow", {}))
        payload["code"] = compiler.compile()
        return _run_backtest(payload, on_progress)
        
    job = submit_job(
        user_id=1,
        agent_token_id=0,
        kind="flow_strategy",
        request_payload=data,
        runner=_flow_runner,
    )
    return jsonify({"status": "success", "message": "Flow strategy dispatched to CalculatedRisk worker", "task_id": job.get("job_id")})

@calculatedrisk_strategy_bp.route("/flow/status", methods=["GET"])
def flow_strategy_status():
    """Get the status of a Flow strategy."""
    task_id = request.args.get("task_id")
    job = get_job_for_worker(task_id) if task_id else None
    if not job:
        return jsonify({"status": "error", "message": "Job not found"}), 404
        
    return jsonify({"status": "success", "task_status": job.get("status"), "task_id": task_id, "result": job.get("result")})

