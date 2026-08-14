import uuid
from flask import jsonify, g, request

def api_response(code: int, msg: str, data: dict = None, http_status: int = None):
    """
    Standardized API response envelope with correlation ID.
    
    Args:
        code: Application-specific status code (200, 400, etc)
        msg: Message describing the response
        data: Optional payload data
        http_status: HTTP status code (defaults to 200 if code is 200, else 400)
    """
    if http_status is None:
        http_status = 200 if code == 200 else 400
        
    correlation_id = getattr(g, 'correlation_id', None)
    if not correlation_id:
        correlation_id = request.headers.get('X-Correlation-ID', str(uuid.uuid4()))
        g.correlation_id = correlation_id
        
    return jsonify({
        'code': code,
        'msg': msg,
        'data': data,
        'correlation_id': correlation_id
    }), http_status
