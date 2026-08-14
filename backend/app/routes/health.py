from flask import g
from app.openapi.blueprint import HumanBlueprint as Blueprint
from app.utils.api_response import api_response
from app.utils.db import get_db_connection

health_blp = Blueprint('health', __name__, url_prefix='/api/v1')

@health_blp.route('/health', methods=['GET'])
def health_check():
    """Liveness probe: basic service ping"""
    return api_response(200, "OK", {"status": "up"})

@health_blp.route('/ready', methods=['GET'])
def readiness_check():
    """Readiness probe: checks DB connection and critical dependencies"""
    try:
        conn = get_db_connection()
        with conn.cursor() as cur:
            cur.execute("SELECT 1")
        conn.close()
        return api_response(200, "Ready", {"status": "ready", "database": "connected"})
    except Exception as e:
        return api_response(503, "Not Ready", {"status": "not_ready", "error": str(e)}, 503)
