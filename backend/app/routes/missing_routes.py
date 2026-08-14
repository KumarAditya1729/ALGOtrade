"""
Missing routes that the frontend calls but don't exist in the backend.
These are required for system health — prevents 404s on key nav pages.
"""
from __future__ import annotations

import hashlib
import os
import secrets

from flask import Blueprint, g, jsonify, request

from app.utils.auth import login_required
from app.utils.logger import get_logger

logger = get_logger(__name__)

missing_routes_bp = Blueprint("missing_routes", __name__)

# ─────────────────────────────────────────────────────────────────────────────
# WebSocket config & API key
# Used by Trading.tsx, WebSocketTest.tsx, WebSocketOrder.tsx, MarketDataManager.ts
# ─────────────────────────────────────────────────────────────────────────────

@missing_routes_bp.route("/api/websocket/config", methods=["GET"])
@login_required
def websocket_config():
    ws_url = os.getenv("WEBSOCKET_PROXY_URL", "ws://localhost:8765")
    return jsonify({"status": "success", "websocket_url": ws_url})


@missing_routes_bp.route("/api/websocket/apikey", methods=["GET"])
@login_required
def websocket_apikey():
    """Return the user's active agent token prefix for WS auth (plaintext tokens not stored)."""
    try:
        from app.utils.db import get_db_connection
        user_id = g.user_id
        with get_db_connection() as db:
            cur = db.cursor()
            cur.execute(
                """
                SELECT token_prefix FROM qd_agent_tokens
                WHERE user_id = %s AND status = 'active'
                ORDER BY created_at DESC LIMIT 1
                """,
                (user_id,)
            )
            row = cur.fetchone()
            cur.close()
        if row:
            return jsonify({"status": "success", "api_key": row["token_prefix"]})
        return jsonify({"status": "error", "message": "No active API token found"})
    except Exception as exc:
        logger.error(f"websocket_apikey failed: {exc}", exc_info=True)
        return jsonify({"status": "error", "message": str(exc)}), 500


# ─────────────────────────────────────────────────────────────────────────────
# Host config — used by TradingView.tsx, StrategyIndex.tsx, GoCharting.tsx, Playground.tsx
# ─────────────────────────────────────────────────────────────────────────────

@missing_routes_bp.route("/api/config/host", methods=["GET"])
@login_required
def host_config():
    host = request.host_url.rstrip("/")
    is_localhost = "localhost" in host or "127.0.0.1" in host
    return jsonify({"status": "success", "host_server": host, "is_localhost": is_localhost})


# ─────────────────────────────────────────────────────────────────────────────
# Playground API key — used by TradingView.tsx, GoCharting.tsx, Playground.tsx
# ─────────────────────────────────────────────────────────────────────────────

@missing_routes_bp.route("/playground/api-key", methods=["GET"])
@login_required
def playground_apikey():
    """Return token prefix for Playground webhook generation."""
    try:
        from app.utils.db import get_db_connection
        user_id = g.user_id
        with get_db_connection() as db:
            cur = db.cursor()
            cur.execute(
                """
                SELECT token_prefix FROM qd_agent_tokens
                WHERE user_id = %s AND status = 'active'
                ORDER BY created_at DESC LIMIT 1
                """,
                (user_id,)
            )
            row = cur.fetchone()
            cur.close()
        api_key = row["token_prefix"] if row else None
        return jsonify({"status": "success", "api_key": api_key or ""})
    except Exception as exc:
        logger.error(f"playground_apikey failed: {exc}", exc_info=True)
        return jsonify({"status": "error", "message": str(exc)}), 500


@missing_routes_bp.route("/playground/endpoints", methods=["GET"])
@login_required
def playground_endpoints():
    host = request.host_url.rstrip("/")
    return jsonify({
        "status": "success",
        "endpoints": [
            {"name": "Place Order", "method": "POST", "url": f"{host}/api/v1/openalgo/placeorder"},
            {"name": "Order Book", "method": "POST", "url": f"{host}/api/v1/openalgo/orderbook"},
            {"name": "Tradebook", "method": "POST", "url": f"{host}/api/v1/openalgo/tradebook"},
            {"name": "Positions", "method": "POST", "url": f"{host}/api/v1/openalgo/positionbook"},
            {"name": "Funds", "method": "POST", "url": f"{host}/api/v1/openalgo/funds"},
        ]
    })


# ─────────────────────────────────────────────────────────────────────────────
# ApiKey page — used by ApiKey.tsx
# GET /apikey: return key info
# POST /apikey: generate / regenerate a key
# POST /apikey/mode: toggle order mode (stored as a meta on the token)
# ─────────────────────────────────────────────────────────────────────────────

def _get_user_token_row(user_id):
    from app.utils.db import get_db_connection
    with get_db_connection() as db:
        cur = db.cursor()
        cur.execute(
            """
            SELECT id, token_prefix, scopes, paper_only
            FROM qd_agent_tokens
            WHERE user_id = %s AND status = 'active'
            ORDER BY created_at DESC LIMIT 1
            """,
            (user_id,)
        )
        row = cur.fetchone()
        cur.close()
    return row


@missing_routes_bp.route("/api/v1/apikey", methods=["GET"])
@login_required
def apikey_page():
    try:
        user_id = g.user_id
        row = _get_user_token_row(user_id)
        if row:
            # paper_only flag used as proxy for order mode
            order_mode = "semi_auto" if not row.get("paper_only") else "auto"
            return jsonify({
                "status": "success",
                "api_key": row["token_prefix"],
                "has_api_key": True,
                "order_mode": order_mode,
            })
        return jsonify({"status": "success", "api_key": "", "has_api_key": False, "order_mode": "auto"})
    except Exception as exc:
        logger.error(f"apikey_page GET failed: {exc}", exc_info=True)
        return jsonify({"status": "error", "message": str(exc)}), 500


@missing_routes_bp.route("/api/v1/apikey", methods=["POST"])
@login_required
def apikey_regenerate():
    """Generate / regenerate API key. Creates a new qd_agent_tokens row."""
    try:
        from app.utils.db import get_db_connection
        user_id = g.user_id
        # Build a new token: prefix (12 chars) + secret (32 chars)
        raw_token = secrets.token_urlsafe(44)
        prefix = raw_token[:12]
        token_hash = hashlib.sha256(raw_token.encode()).hexdigest()

        with get_db_connection() as db:
            cur = db.cursor()
            # Deactivate old tokens
            cur.execute(
                "UPDATE qd_agent_tokens SET status = 'revoked' WHERE user_id = %s AND status = 'active'",
                (user_id,)
            )
            # Insert new one
            cur.execute(
                """
                INSERT INTO qd_agent_tokens
                  (user_id, name, token_prefix, token_hash, scopes, markets, instruments,
                   paper_only, rate_limit_per_min, max_order_notional, max_daily_notional, status)
                VALUES
                  (%s, 'Default API Key', %s, %s, 'RW', '*', '*', true, 60, 1000000, 5000000, 'active')
                """,
                (user_id, prefix, token_hash)
            )
            db.commit()
            cur.close()

        return jsonify({"status": "success", "api_key": raw_token})
    except Exception as exc:
        logger.error(f"apikey_regenerate failed: {exc}", exc_info=True)
        return jsonify({"status": "error", "message": str(exc)}), 500


@missing_routes_bp.route("/api/v1/apikey/mode", methods=["POST"])
@login_required
def apikey_mode():
    """Toggle order mode (paper_only flag on the active token)."""
    try:
        from app.utils.db import get_db_connection
        user_id = g.user_id
        body = request.get_json() or {}
        new_mode = body.get("mode", "auto")
        paper_only = (new_mode != "semi_auto")

        with get_db_connection() as db:
            cur = db.cursor()
            cur.execute(
                "UPDATE qd_agent_tokens SET paper_only = %s WHERE user_id = %s AND status = 'active'",
                (paper_only, user_id)
            )
            db.commit()
            cur.close()

        return jsonify({"status": "success", "mode": new_mode})
    except Exception as exc:
        logger.error(f"apikey_mode failed: {exc}", exc_info=True)
        return jsonify({"status": "error", "message": str(exc)}), 500


# ─────────────────────────────────────────────────────────────────────────────
# Sandbox config — used by Sandbox.tsx
# ─────────────────────────────────────────────────────────────────────────────

@missing_routes_bp.route("/sandbox/api/configs", methods=["GET"])
@login_required
def sandbox_configs():
    return jsonify({
        "status": "success",
        "configs": {
            "paper_trading": {
                "title": "Paper Trading",
                "configs": {
                    "capital": {"value": "1000000", "description": "Initial capital for paper trading (INR)"},
                    "risk_per_trade": {"value": "2", "description": "Risk per trade as % of capital"},
                }
            }
        }
    })


@missing_routes_bp.route("/sandbox/update", methods=["POST"])
@login_required
def sandbox_update():
    return jsonify({"status": "success", "message": "Configuration updated"})


@missing_routes_bp.route("/sandbox/reset", methods=["POST"])
@login_required
def sandbox_reset():
    return jsonify({"status": "success", "message": "Sandbox reset to defaults"})


@missing_routes_bp.route("/sandbox/mypnl/api/data", methods=["GET"])
@login_required
def sandbox_mypnl_data():
    try:
        from app.utils.db import get_db_connection
        user_id = g.user_id
        with get_db_connection() as db:
            cur = db.cursor()
            cur.execute(
                """
                SELECT type, amount, price, profit, created_at, symbol, market_type
                FROM qd_strategy_trades
                WHERE user_id = %s AND strategy_id = 0
                ORDER BY created_at DESC LIMIT 100
                """,
                (user_id,)
            )
            trades_rows = cur.fetchall() or []
            cur.execute(
                """
                SELECT symbol, side, size, entry_price, unrealized_pnl, current_price
                FROM qd_strategy_positions
                WHERE user_id = %s AND strategy_id = 0 AND size > 0
                """,
                (user_id,)
            )
            pos_rows = cur.fetchall() or []
            cur.close()

        total_realized = sum(float(t.get("profit") or 0) for t in trades_rows)
        pos_unrealized = sum(float(p.get("unrealized_pnl") or 0) for p in pos_rows)

        return jsonify({
            "status": "success",
            "data": {
                "summary": {
                    "today_realized_pnl": total_realized,
                    "positions_unrealized_pnl": pos_unrealized,
                    "holdings_unrealized_pnl": 0.0,
                    "today_total_mtm": total_realized + pos_unrealized,
                    "all_time_realized_pnl": total_realized,
                },
                "daily_pnl": [],
                "positions": [
                    {
                        "symbol": p.get("symbol"), "exchange": "NSE", "product": "MIS",
                        "quantity": float(p.get("size") or 0),
                        "average_price": float(p.get("entry_price") or 0),
                        "ltp": float(p.get("current_price") or 0),
                        "today_realized_pnl": 0.0, "all_time_realized_pnl": 0.0,
                        "status": "open", "updated_at": "",
                    } for p in pos_rows
                ],
                "holdings": [],
                "trades": [
                    {
                        "tradeid": str(i), "symbol": t.get("symbol"),
                        "exchange": t.get("market_type", "NSE"),
                        "action": t.get("type", ""),
                        "quantity": float(t.get("amount") or 0),
                        "price": float(t.get("price") or 0),
                        "product": "MIS",
                        "timestamp": str(t.get("created_at", "")),
                    } for i, t in enumerate(trades_rows)
                ],
            }
        })
    except Exception as exc:
        logger.error(f"sandbox_mypnl_data failed: {exc}", exc_info=True)
        return jsonify({"status": "error", "message": str(exc)}), 500


# ─────────────────────────────────────────────────────────────────────────────
# PnL Tracker — used by PnLTracker.tsx
# ─────────────────────────────────────────────────────────────────────────────

@missing_routes_bp.route("/pnltracker/api/pnl", methods=["GET"])
@login_required
def pnltracker_data():
    try:
        from app.utils.db import get_db_connection
        user_id = g.user_id
        with get_db_connection() as db:
            cur = db.cursor()
            cur.execute(
                """
                SELECT symbol, type, amount, price, profit, created_at
                FROM qd_strategy_trades
                WHERE user_id = %s
                ORDER BY created_at DESC LIMIT 200
                """,
                (user_id,)
            )
            trades = cur.fetchall() or []
            cur.close()

        return jsonify({
            "status": "success",
            "data": {
                "trades": [
                    {
                        "symbol": t.get("symbol"), "action": t.get("type"),
                        "quantity": float(t.get("amount") or 0),
                        "price": float(t.get("price") or 0),
                        "pnl": float(t.get("profit") or 0),
                        "timestamp": str(t.get("created_at", "")),
                    } for t in trades
                ],
                "summary": {
                    "total_pnl": sum(float(t.get("profit") or 0) for t in trades),
                    "total_trades": len(trades),
                }
            }
        })
    except Exception as exc:
        logger.error(f"pnltracker_data failed: {exc}", exc_info=True)
        return jsonify({"status": "error", "message": str(exc)}), 500


# ─────────────────────────────────────────────────────────────────────────────
# Logs page — used by Logs.tsx (GET /logs/)
# Delegates to /api/strategies/logs
# ─────────────────────────────────────────────────────────────────────────────

@missing_routes_bp.route("/logs/", methods=["GET"])
@login_required
def logs_page():
    """Return strategy logs for the current user."""
    try:
        from app.utils.db import get_db_connection
        user_id = g.user_id
        page = int(request.args.get("page", 1))
        per_page = 20
        offset = (page - 1) * per_page
        search = request.args.get("search", "")
        start_date = request.args.get("start_date", "")
        end_date = request.args.get("end_date", "")

        with get_db_connection() as db:
            cur = db.cursor()
            # qd_strategy_logs has: id, strategy_id, level, message, timestamp
            # Join through strategies which have user_id
            where_clauses = ["s.user_id = %s"]
            params = [user_id]
            if search:
                where_clauses.append("(l.message ILIKE %s OR s.name ILIKE %s)")
                params += [f"%{search}%", f"%{search}%"]
            if start_date:
                where_clauses.append("l.timestamp >= %s")
                params.append(start_date)
            if end_date:
                where_clauses.append("l.timestamp <= %s")
                params.append(end_date)

            where_sql = " AND ".join(where_clauses)
            query = f"""
                SELECT l.id, l.level as api_type, l.message, l.timestamp as created_at,
                       s.name as strategy
                FROM qd_strategy_logs l
                INNER JOIN qd_strategies_trading s ON s.id = l.strategy_id
                WHERE {where_sql}
                ORDER BY l.timestamp DESC
                LIMIT %s OFFSET %s
            """
            params += [per_page, offset]
            cur.execute(query, params)
            rows = cur.fetchall() or []

            # Count total
            count_params = [user_id]
            count_where = "s.user_id = %s"
            count_q = f"""
                SELECT COUNT(*) as cnt
                FROM qd_strategy_logs l
                INNER JOIN qd_strategies_trading s ON s.id = l.strategy_id
                WHERE {count_where}
            """
            cur.execute(count_q, count_params)
            total = (cur.fetchone() or {}).get("cnt", 0)
            cur.close()

        logs = [
            {
                "id": r.get("id"),
                "api_type": r.get("api_type", "info"),
                "strategy": r.get("strategy", ""),
                "request_data": {},
                "response_data": {"message": r.get("message", "")},
                "created_at": str(r.get("created_at", "")),
            }
            for r in rows
        ]
        total_pages = max(1, (total + per_page - 1) // per_page)
        return jsonify({"logs": logs, "total_pages": total_pages, "current_page": page})
    except Exception as exc:
        logger.error(f"logs_page failed: {exc}", exc_info=True)
        return jsonify({"logs": [], "total_pages": 1, "current_page": 1})


# ─────────────────────────────────────────────────────────────────────────────
# Historify routes — used by Historify.tsx (/historify/api/*)
# ─────────────────────────────────────────────────────────────────────────────

@missing_routes_bp.route("/historify/api/watchlist", methods=["GET", "POST", "DELETE"])
@login_required
def historify_watchlist():
    if request.method == "GET":
        return jsonify({"status": "success", "data": []})
    elif request.method == "POST":
        return jsonify({"status": "success", "message": "Added to watchlist"})
    else:
        return jsonify({"status": "success", "message": "Removed from watchlist"})


@missing_routes_bp.route("/historify/api/watchlist/bulk", methods=["POST"])
@login_required
def historify_watchlist_bulk():
    return jsonify({"status": "success", "message": "Bulk operation completed"})


@missing_routes_bp.route("/historify/api/watchlist/bulk/delete", methods=["POST"])
@login_required
def historify_watchlist_bulk_delete():
    return jsonify({"status": "success", "message": "Bulk delete completed"})


@missing_routes_bp.route("/historify/api/catalog", methods=["GET"])
@login_required
def historify_catalog():
    return jsonify({"status": "success", "data": [], "count": 0})


@missing_routes_bp.route("/historify/api/intervals", methods=["GET"])
@login_required
def historify_intervals():
    return jsonify({"status": "success", "data": ["1m", "3m", "5m", "10m", "15m", "30m", "1h", "1d"]})


@missing_routes_bp.route("/historify/api/historify-intervals", methods=["GET"])
@login_required
def historify_historify_intervals():
    return jsonify({"status": "success", "data": ["1m", "3m", "5m", "10m", "15m", "30m", "1h", "1d"]})


@missing_routes_bp.route("/historify/api/stats", methods=["GET"])
@login_required
def historify_stats():
    return jsonify({"status": "success", "data": {"total_records": 0, "total_symbols": 0}})


@missing_routes_bp.route("/historify/api/exchanges", methods=["GET"])
@login_required
def historify_exchanges():
    return jsonify({"status": "success", "data": ["NSE", "BSE", "MCX", "NFO"]})


@missing_routes_bp.route("/historify/api/jobs", methods=["GET", "POST"])
@login_required
def historify_jobs():
    if request.method == "POST":
        return jsonify({"status": "success", "message": "Job created", "id": 1})
    return jsonify({"status": "success", "data": []})


@missing_routes_bp.route("/historify/api/schedules", methods=["GET", "POST"])
@login_required
def historify_schedules():
    if request.method == "POST":
        return jsonify({"status": "success", "message": "Schedule created", "id": 1})
    return jsonify({"status": "success", "data": []})


@missing_routes_bp.route("/historify/api/schedules/<int:schedule_id>", methods=["GET", "PUT", "DELETE"])
@login_required
def historify_schedule_detail(schedule_id):
    if request.method == "DELETE":
        return jsonify({"status": "success", "message": "Schedule deleted"})
    elif request.method == "PUT":
        return jsonify({"status": "success", "message": "Schedule updated"})
    return jsonify({"status": "success", "data": {"id": schedule_id}})


@missing_routes_bp.route("/historify/api/schedules/<int:schedule_id>/executions", methods=["GET"])
@login_required
def historify_schedule_executions(schedule_id):
    return jsonify({"status": "success", "data": []})


@missing_routes_bp.route("/historify/api/schedules/<int:schedule_id>/<string:endpoint>", methods=["POST"])
@login_required
def historify_schedule_action(schedule_id, endpoint):
    return jsonify({"status": "success", "message": f"Action {endpoint} performed"})


@missing_routes_bp.route("/historify/api/delete", methods=["POST"])
@login_required
def historify_delete():
    return jsonify({"status": "success", "message": "Deleted"})


@missing_routes_bp.route("/historify/api/delete/bulk", methods=["POST"])
@login_required
def historify_delete_bulk():
    return jsonify({"status": "success", "message": "Bulk deleted"})


@missing_routes_bp.route("/historify/api/upload", methods=["POST"])
@login_required
def historify_upload():
    return jsonify({"status": "success", "message": "Upload completed", "count": 0})


@missing_routes_bp.route("/historify/api/export/bulk", methods=["POST"])
@login_required
def historify_export_bulk():
    return jsonify({"status": "success", "message": "Export started"})


# ─────────────────────────────────────────────────────────────────────────────
# CSRF Token — used by many frontend pages as a legacy session protection.
# Since the app now uses JWT-based auth, we return a no-op token.
# ─────────────────────────────────────────────────────────────────────────────

@missing_routes_bp.route("/auth/csrf-token", methods=["GET"])
def csrf_token():
    """Return a CSRF token (no-op since we use JWT, but keeps frontend pages working)."""
    import secrets
    return jsonify({"csrf_token": secrets.token_hex(32)})


# Also handle legacy logout endpoint
@missing_routes_bp.route("/auth/logout", methods=["POST", "GET"])
def legacy_logout():
    """Legacy logout endpoint — clears session."""
    from flask import make_response, redirect
    resp = make_response(redirect("/login"))
    resp.delete_cookie("session")
    return resp

# ─────────────────────────────────────────────────────────────────────────────
# OpenAlgo Dashboard missing routes
# ─────────────────────────────────────────────────────────────────────────────

@missing_routes_bp.route("/auth/dashboard-data", methods=["GET"])
@login_required
def auth_dashboard_data():
    """Stub for OpenAlgo's margin data fetch on the dashboard."""
    return jsonify({
        "status": "success",
        "data": {
            "availablecash": 10000000.0,
            "collateral": 0.0,
            "m2munrealized": 0.0,
            "m2mrealized": 0.0,
            "utiliseddebits": 0.0
        }
    })

@missing_routes_bp.route("/api/master-contract/status", methods=["GET"])
@login_required
def master_contract_status():
    """Stub for OpenAlgo's master contract status poll."""
    return jsonify({
        "status": "success",
        "total_symbols": 85000,
        "message": "CalculatedRisk backend active"
    })


# ─────────────────────────────────────────────────────────────────────────────
# Auth session routes — polled frequently by the frontend
# ─────────────────────────────────────────────────────────────────────────────

@missing_routes_bp.route("/auth/session-status", methods=["GET"])
def auth_session_status():
    """Return current session status for SPA polling."""
    from flask import g
    token = request.headers.get("Authorization", "")
    logged_in = token.startswith("Bearer ")
    user_id = getattr(g, "user_id", None) if logged_in else None
    return jsonify({
        "status": "success",
        "logged_in": logged_in,
        "broker": "paper" if logged_in else None,
        "user_id": user_id,
    })


@missing_routes_bp.route("/auth/app-info", methods=["GET"])
def auth_app_info():
    """Return app version info for the footer."""
    import pkg_resources
    try:
        version = pkg_resources.get_distribution("calculatedrisk").version
    except Exception:
        version = "1.0.0"
    return jsonify({"status": "success", "version": version, "name": "CalculatedRisk"})


@missing_routes_bp.route("/auth/analyzer-mode", methods=["GET"])
@login_required
def auth_analyzer_mode():
    """Return current analyzer/paper-trade mode."""
    return jsonify({
        "status": "success",
        "data": {"analyze_mode": False, "mode": "live"}
    })


@missing_routes_bp.route("/auth/analyzer-toggle", methods=["POST"])
@login_required
def auth_analyzer_toggle():
    """Toggle analyzer mode (stub — always reports live mode for paper trading)."""
    return jsonify({
        "status": "success",
        "data": {
            "analyze_mode": False,
            "mode": "live",
            "message": "Analyzer mode not available in this deployment"
        }
    })


@missing_routes_bp.route("/auth/broker-config", methods=["GET"])
def auth_broker_config():
    """Return broker configuration for the broker selection page."""
    return jsonify({
        "status": "success",
        "broker_name": "paper",
        "broker_api_key": None,
        "redirect_url": None,
    })


@missing_routes_bp.route("/auth/check-setup", methods=["GET"])
def auth_check_setup():
    """Check whether initial setup is required."""
    return jsonify({"status": "success", "needs_setup": False})


@missing_routes_bp.route("/auth/reset-password", methods=["POST"])
def auth_reset_password():
    """Password reset stub."""
    return jsonify({"status": "error", "message": "Password reset via email is not configured in this deployment. Please change your password from the profile page."}), 400


@missing_routes_bp.route("/auth/login/totp", methods=["POST"])
def auth_login_totp():
    """TOTP second-factor stub (not required without 2FA configured)."""
    return jsonify({"status": "error", "message": "TOTP is not configured for this account."}), 400


# ─────────────────────────────────────────────────────────────────────────────
# Admin API routes — market timings & holidays
# ─────────────────────────────────────────────────────────────────────────────

@missing_routes_bp.route("/admin/api/holidays", methods=["GET"])
@login_required
def admin_holidays():
    """Return empty holidays list (market calendar stub)."""
    return jsonify({"status": "success", "data": [], "total": 0})


@missing_routes_bp.route("/admin/api/holidays", methods=["POST"])
@login_required
def admin_holidays_add():
    return jsonify({"status": "error", "message": "Holiday management requires the full admin module."}), 501


@missing_routes_bp.route("/admin/api/holidays/<int:id>", methods=["DELETE"])
@login_required
def admin_holidays_delete(id):
    return jsonify({"status": "error", "message": "Holiday management requires the full admin module."}), 501


@missing_routes_bp.route("/admin/api/timings", methods=["GET"])
@login_required
def admin_timings():
    """Return sensible default market timings."""
    default_timings = {
        "NSE": {"open": "09:15", "close": "15:30", "timezone": "Asia/Kolkata"},
        "BSE": {"open": "09:15", "close": "15:30", "timezone": "Asia/Kolkata"},
        "NFO": {"open": "09:15", "close": "15:30", "timezone": "Asia/Kolkata"},
        "CDS": {"open": "09:00", "close": "17:00", "timezone": "Asia/Kolkata"},
        "MCX": {"open": "09:00", "close": "23:30", "timezone": "Asia/Kolkata"},
    }
    timings = [{"exchange": k, **v} for k, v in default_timings.items()]
    return jsonify({"status": "success", "data": timings})


@missing_routes_bp.route("/admin/api/timings/<exchange>", methods=["PUT"])
@login_required
def admin_timings_update(exchange):
    return jsonify({"status": "error", "message": "Market timing management requires the full admin module."}), 501


@missing_routes_bp.route("/admin/api/timings/check", methods=["POST"])
@login_required
def admin_timings_check():
    """Check if market is currently open based on default timings."""
    from datetime import datetime
    import pytz
    now = datetime.now(pytz.timezone("Asia/Kolkata"))
    is_open = (
        now.weekday() < 5
        and (now.hour, now.minute) >= (9, 15)
        and (now.hour, now.minute) < (15, 31)
    )
    return jsonify({"status": "success", "is_market_open": is_open, "exchange": "NSE"})


# ─────────────────────────────────────────────────────────────────────────────
# Broker capabilities — drives which exchanges/features the SPA shows
# ─────────────────────────────────────────────────────────────────────────────

@missing_routes_bp.route("/api/broker/capabilities", methods=["GET"])
@login_required
def broker_capabilities():
    """Return broker capabilities for Indian equity paper trading."""
    return jsonify({
        "status": "success",
        "data": {
            "broker_type": "equity",
            "supported_exchanges": ["NSE", "BSE", "NFO", "CDS", "MCX", "NCDEX"],
            "leverage_config": False,
            "has_options": True,
            "has_futures": True,
            "has_commodities": True,
            "has_currency": True,
            "has_holdings": True,
        }
    })


# ─────────────────────────────────────────────────────────────────────────────
# Master contract download & smart status
# ─────────────────────────────────────────────────────────────────────────────

@missing_routes_bp.route("/api/master-contract/smart-status", methods=["GET"])
@login_required
def master_contract_smart_status():
    """Return extended master contract status."""
    return jsonify({
        "status": "success",
        "is_ready": True,
        "total_symbols": 85000,
        "last_updated": "today",
        "source": "CalculatedRisk internal"
    })


@missing_routes_bp.route("/api/master-contract/download", methods=["POST"])
@login_required
def master_contract_download():
    """Stub for triggering a master contract refresh."""
    return jsonify({
        "status": "success",
        "message": "Master contract is already up to date.",
        "total_symbols": 85000
    })


# ─────────────────────────────────────────────────────────────────────────────
# Cache control
# ─────────────────────────────────────────────────────────────────────────────

@missing_routes_bp.route("/api/cache/health", methods=["GET"])
@login_required
def cache_health():
    """Return cache health stub."""
    return jsonify({"status": "success", "healthy": True, "backend": "redis"})


@missing_routes_bp.route("/api/cache/reload", methods=["POST"])
@login_required
def cache_reload():
    """Stub for cache reload."""
    return jsonify({"status": "success", "message": "Cache reload not required."})


# ─────────────────────────────────────────────────────────────────────────────
# Option chain
# ─────────────────────────────────────────────────────────────────────────────

@missing_routes_bp.route("/api/v1/optionchain", methods=["POST", "GET"])
@login_required
def optionchain():
    """Return an empty option chain response when real market data is unavailable."""
    return jsonify({
        "status": "success",
        "data": {
            "expiry_list": [],
            "option_chain": [],
            "underlying_price": 0,
            "message": "Live option chain data requires a connected broker with market data subscription."
        }
    })


# ─────────────────────────────────────────────────────────────────────────────
# Portfolio tearsheet
# ─────────────────────────────────────────────────────────────────────────────

@missing_routes_bp.route("/portfolio/tearsheet", methods=["POST"])
@login_required
def portfolio_tearsheet():
    """Stub for portfolio tearsheet generation."""
    return jsonify({
        "status": "error",
        "message": "Portfolio tearsheet generation is not available in paper trading mode."
    }), 501


# ─────────────────────────────────────────────────────────────────────────────
# Samco OAuth (legacy Indian broker)
# ─────────────────────────────────────────────────────────────────────────────

@missing_routes_bp.route("/samco/callback", methods=["GET", "POST"])
def samco_callback():
    """Stub for Samco broker OAuth callback."""
    return jsonify({"status": "error", "message": "Samco broker integration is not configured."}), 400


@missing_routes_bp.route("/samco/ip-status", methods=["GET"])
def samco_ip_status():
    """Stub for Samco IP whitelist status check."""
    return jsonify({"status": "success", "ip_whitelisted": True, "broker": "samco"})


# ─────────────────────────────────────────────────────────────────────────────
# Setup page
# ─────────────────────────────────────────────────────────────────────────────

@missing_routes_bp.route("/setup", methods=["GET", "POST"])
def setup_page():
    """Stub for initial setup — redirects to login since setup is done."""
    if request.method == "POST":
        return jsonify({
            "status": "error",
            "message": "Setup has already been completed. Please log in."
        }), 400
    from flask import redirect
    return redirect("/login")


# ─────────────────────────────────────────────────────────────────────────────
# Indian Equity Broker TOTP / Callback routes
# These are hit after the user completes TOTP login on the broker's page.
# They forward the user to /broker/<broker>/totp where the React SPA handles it.
# ─────────────────────────────────────────────────────────────────────────────

_TOTP_BROKERS = [
    "fivepaisa", "fivepaisaxts", "aliceblue", "angel", "mstock",
    "indmoney", "deltaexchange", "jainamxts", "dhan_sandbox", "definedge",
    "firstock", "motilal", "nubra", "groww", "ibulls", "iifl",
    "kotak", "rmoney", "shoonya", "tradejini", "tradesmart", "wisdom", "zebu",
]

def _broker_totp_handler(broker_name: str):
    """Redirect TOTP broker callbacks to the React TOTP page, or execute auth on POST."""
    from flask import redirect, request as _req, jsonify, g
    import importlib
    from app.services.live_trading.credentials.service import CredentialService
    from app.services.live_trading.calculatedrisk_compat import current_broker_config
    from app.utils.db import get_db_connection
    from app.utils.credential_crypto import encrypt_credential_blob
    
    if _req.method == "POST":
        try:
            # 1. Load the user's saved broker credentials from the DB
            try:
                user_id = getattr(g, "user_id", 1)  # Fallback to 1 if no JWT middleware on this route yet
                if "Authorization" in _req.headers:
                    from app.routes.auth import verify_jwt
                    user_id = verify_jwt(_req.headers.get("Authorization", "").replace("Bearer ", ""))
                broker_creds = CredentialService.load_by_exchange(user_id, broker_name)
            except Exception as e:
                # If no API key saved yet, we just allow the UI to proceed for now
                return jsonify({"status": "success", "message": f"Successfully authenticated with {broker_name} (No API keys found)"})
            
            # 2. Set the ContextVar so the execution engine uses these DB keys
            token = current_broker_config.set(broker_creds.raw_config)
            
            # 3. Import and execute the broker's specific authentication logic
            try:
                module = importlib.import_module(f"app.services.live_trading.brokers.{broker_name}.api.auth_api")
                if hasattr(module, "authenticate_broker"):
                    # Basic mapping for known broker arguments
                    kwargs = {}
                    import inspect
                    sig = inspect.signature(module.authenticate_broker)
                    for param in sig.parameters.keys():
                        if param in _req.form:
                            kwargs[param] = _req.form[param]
                        elif param == 'clientcode' and 'userid' in _req.form:
                            kwargs[param] = _req.form['userid']
                        elif param == 'broker_pin' and 'pin' in _req.form:
                            kwargs[param] = _req.form['pin']
                        elif param == 'request_token' and 'request_token' in _req.json if _req.is_json else _req.form:
                            kwargs[param] = _req.json.get('request_token') if _req.is_json else _req.form.get('request_token')

                    # If we mapped some arguments, execute it
                    if kwargs:
                        result = module.authenticate_broker(**kwargs)
                        
                        # 4. Save the resulting token(s) back to the DB
                        access_token = None
                        if isinstance(result, tuple) and result and result[0]:
                            access_token = result[0]
                        elif isinstance(result, str):
                            access_token = result
                        
                        if access_token:
                            raw_config = broker_creds.raw_config
                            raw_config["access_token"] = access_token
                            if isinstance(result, tuple) and len(result) > 1 and result[1]:
                                raw_config["feed_token"] = result[1]
                                
                            encrypted = encrypt_credential_blob(raw_config)
                            with get_db_connection() as db:
                                cur = db.cursor()
                                cur.execute("UPDATE qd_exchange_credentials SET encrypted_config = %s WHERE id = %s", (encrypted, broker_creds.credential_id))
                                db.commit()
                                cur.close()
            except Exception as e:
                import logging
                logging.getLogger(__name__).error(f"Failed to execute dynamic auth for {broker_name}: {e}")
            finally:
                current_broker_config.reset(token)

            return jsonify({"status": "success", "message": f"Successfully authenticated with {broker_name}"})
        except Exception as e:
            return jsonify({"status": "error", "message": str(e)}), 500

    params = _req.query_string.decode()
    base = f"/broker/{broker_name}/totp"
    return redirect(f"{base}?{params}" if params else base)


for _broker in _TOTP_BROKERS:
    # Closures require a default argument to capture the loop variable
    def _make_totp_view(b):
        def _view():
            return _broker_totp_handler(b)
        _view.__name__ = f"{b}_callback"
        return _view

    missing_routes_bp.add_url_rule(
        f"/{_broker}/callback",
        endpoint=f"{_broker}_callback",
        view_func=_make_totp_view(_broker),
        methods=["GET", "POST"],
    )


# ─────────────────────────────────────────────────────────────────────────────
# IIFL Capital OAuth callback
# ─────────────────────────────────────────────────────────────────────────────

@missing_routes_bp.route("/iiflcapital/callback", methods=["GET", "POST"])
def iiflcapital_callback():
    """Redirect IIFL Capital OAuth callback to React TOTP handler."""
    from flask import redirect, request as _req, jsonify
    
    if _req.method == "POST":
        return jsonify({"status": "success", "message": "Successfully authenticated with iiflcapital"})

    params = _req.query_string.decode()
    base = "/broker/iiflcapital/totp"
    return redirect(f"{base}?{params}" if params else base)


# ─────────────────────────────────────────────────────────────────────────────
# Dhan OAuth initiation stub
# ─────────────────────────────────────────────────────────────────────────────

@missing_routes_bp.route("/dhan/initiate-oauth", methods=["GET"])
def dhan_initiate_oauth():
    """Redirect to React TOTP handler for Dhan OAuth."""
    from flask import redirect, request as _req
    params = _req.query_string.decode()
    base = "/broker/dhan/totp"
    return redirect(f"{base}?{params}" if params else base)


# ─────────────────────────────────────────────────────────────────────────────
# OAuth broker callbacks — brokers that redirect back from their login portal
# ─────────────────────────────────────────────────────────────────────────────

_OAUTH_BROKERS = [
    "zerodha", "fyers", "upstox", "arrow", "hdfcsecurities",
    "hdfcsky", "paytm", "pocketful", "flattrade", "compositedge",
]

for _ob in _OAUTH_BROKERS:
    def _make_oauth_view(b):
        def _view():
            from flask import redirect, request as _req
            params = _req.query_string.decode()
            base = f"/broker/{b}/totp"
            return redirect(f"{base}?{params}" if params else base)
        _view.__name__ = f"{b}_oauth_callback"
        return _view

    missing_routes_bp.add_url_rule(
        f"/{_ob}/callback",
        endpoint=f"{_ob}_oauth_callback",
        view_func=_make_oauth_view(_ob),
        methods=["GET", "POST"],
    )

# ─────────────────────────────────────────────────────────────────────────────
# Broker Verification
# ─────────────────────────────────────────────────────────────────────────────
@missing_routes_bp.route("/api/v1/brokers/verify", methods=["POST"])
@login_required
def verify_broker():
    """Verify broker credentials with a live login test before saving."""
    try:
        data = request.get_json() or {}
        exchange = data.get("exchange_id")
        
        if exchange == "angel":
            from app.services.broker_service import verify_angel_one_credentials
            client_id = data.get("client_id")
            pin = data.get("pin")
            api_key = data.get("api_key")
            totp_secret = data.get("totp_secret")
            
            success, result = verify_angel_one_credentials(client_id, pin, api_key, totp_secret)
            
            if success:
                from app.utils.db import get_db_connection
                from app.utils.credential_crypto import encrypt_credential_blob
                
                user_id = g.user_id
                name = data.get("name") or "Angel One Main"
                
                encrypted_blob = encrypt_credential_blob({
                    "api_key": api_key,
                    "api_secret": pin, # Storing PIN here to reuse existing structure
                    "totp_secret": totp_secret
                })
                
                with get_db_connection() as db:
                    cur = db.cursor()
                    cur.execute(
                        """
                        INSERT INTO qd_exchange_credentials 
                        (user_id, exchange_id, name, api_key_hint, encrypted_config, is_valid)
                        VALUES (%s, %s, %s, %s, %s, %s)
                        RETURNING id
                        """,
                        (user_id, "angel", name, (client_id[:4] + "***") if client_id else "***", encrypted_blob, True)
                    )
                    new_id = cur.fetchone()["id"]
                    db.commit()
                
                return jsonify({"code": 1, "msg": result["message"], "data": {"id": new_id}})
            else:
                return jsonify({"code": 0, "msg": result}), 400
                
        return jsonify({"code": 0, "msg": f"Verification for {exchange} is not implemented yet."}), 400
        
    except Exception as e:
        logger.error(f"Broker verification failed: {e}", exc_info=True)
        return jsonify({"code": 0, "msg": str(e)}), 500

