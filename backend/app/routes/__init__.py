"""
API Routes Module — Agent Gateway + OpenAPI-registered human routes.
"""
from flask import Flask


def register_routes(app: Flask):
    """Register Agent Gateway and human web API (via flask-smorest)."""
    from app.openapi import init_openapi
    init_openapi(app)

    from app.routes.agent_v1 import register as register_agent_v1
    register_agent_v1(app)

    from app.routes.options_tools import options_tools_bp
    app.register_blueprint(options_tools_bp)

    from app.routes.calculatedrisk_strategy import calculatedrisk_strategy_bp
    app.register_blueprint(calculatedrisk_strategy_bp)

    # Register missing routes that the frontend calls but previously had no backend handler
    from app.routes.missing_routes import missing_routes_bp
    app.register_blueprint(missing_routes_bp)
    
    from app.routes.bots import bots_bp
    app.register_blueprint(bots_bp, url_prefix="/api/v1/bots")
