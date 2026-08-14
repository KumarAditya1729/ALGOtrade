from flask import g, jsonify, request
import time
import json
import uuid

from app.openapi.blueprint import HumanBlueprint as Blueprint
from app.utils.logger import get_logger
from app.utils.db import get_db_connection
from app.utils.auth import login_required

logger = get_logger(__name__)

# This blueprint emulates the legacy OpenAlgo API interface
# that the frontend uses for Indian stock markets (e.g. NSE/BSE).
# It routes "paper" orders safely into the CalculatedRisk core pending_orders table.
openalgo_blp = Blueprint(
    "openalgo", "openalgo", description="OpenAlgo compatible endpoints for Indian Trading UI"
)


@openalgo_blp.route("/funds", methods=["POST"])
@login_required
def get_funds():
    """Return simulated margins for paper trading."""
    # Real logic can pull from dashboard.py / qd_users / qd_strategy_ledger
    # For now, we return a virtual 1M paper balance so the UI works.
    return jsonify({
        "status": "success",
        "data": {
            "availablecash": 1000000.00,
            "collateral": 0.0,
            "m2munrealized": 0.0,
            "m2mrealized": 0.0,
            "utiliseddebits": 0.0
        }
    })


@openalgo_blp.route("/placeorder", methods=["POST"])
@openalgo_blp.route("/placesmartorder", methods=["POST"])
def placeorder():
    try:
        body = request.get_json() or {}
        apikey = body.get("apikey", "")
        
        # 1. Try Bearer token (Frontend testing)
        user_id = None
        auth_header = request.headers.get("Authorization")
        if auth_header and auth_header.lower().startswith("bearer "):
            token = auth_header.split()[1]
            from app.utils.auth import verify_token
            payload = verify_token(token)
            if payload:
                user_id = payload.get("user_id")
                
        # 2. Try API key (TradingView webhooks)
        if not user_id and apikey:
            with get_db_connection() as db:
                cur = db.cursor()
                cur.execute("SELECT user_id FROM qd_agent_tokens WHERE token_prefix = %s", (apikey,))
                row = cur.fetchone()
                cur.close()
            if row:
                user_id = row["user_id"]
                
        if not user_id:
            return jsonify({"status": "error", "message": "Unauthorized: Missing or invalid token/apikey"}), 401
            
        g.user_id = user_id
        
        symbol = body.get("symbol")
        exchange = body.get("exchange")
        action = body.get("action", "").lower()
        quantity = int(body.get("quantity", 0))
        price_type = body.get("pricetype", "MARKET").lower()
        product = body.get("product", "CNC")
        price = float(body.get("price", 0))
        trigger_price = float(body.get("trigger_price", 0))
        
        if not symbol or quantity <= 0:
            return jsonify({"status": "error", "message": "Invalid symbol or quantity"}), 400
            
        # For openalgo compat, if apikey is passed we use it for live logic, else paper
        # but for now we enforce paper until Phase 2.
        execution_mode = "paper" if "paper" in apikey.lower() else "paper" # Fail-safe to paper
        exchange_id = "paper" if execution_mode == "paper" else exchange
        
        signal_type = "long" if action == "buy" else "short"
        # order_type mapping
        order_type = "market"
        if price_type == "limit":
            order_type = "limit"
        elif price_type in ("sl", "sl-m"):
            order_type = "stop"
            
        idempotency_key = f"ui_manual_{user_id}_{int(time.time() * 1000)}"
        orderid = str(uuid.uuid4())
            
        payload = {
            "base_currency": symbol,
            "quote_currency": "INR",
            "base_qty": quantity,
            "signal_type": signal_type,
            "price": price,
            "limit_price": price if order_type == 'limit' else 0.0,
            "order_type": order_type,
            "execution_mode": execution_mode,
            "client_order_id": orderid,
            "credential_id": 0,
            "exchange_id": exchange_id,
            "leverage": 1,
            "product": product
        }
        
        from app.services.user_preferences import get_notification_settings
        ns = get_notification_settings(int(user_id))
        if ns:
            payload["notification_config"] = {
                "channels": ns.get("default_channels", []),
                "targets": ns,
                "user_id": int(user_id)
            }
        
        with get_db_connection() as db:
            cur = db.cursor()
            # MySQL syntax
            cur.execute(
                """
                INSERT INTO pending_orders
                  (user_id, strategy_id, symbol, signal_type, signal_ts, market_type,
                   order_type, amount, price, execution_mode, status, priority,
                   attempts, max_attempts, last_error, payload_json, strategy_run_id,
                   order_intent_id, idempotency_key, created_at, updated_at, exchange_id)
                VALUES
                  (%s, 0, %s, %s, %s, %s, %s, %s, %s, %s, 'pending', 0,
                   0, 10, '', %s, 0, 0, %s, NOW(), NOW(), %s)
                ON CONFLICT (idempotency_key) DO NOTHING
                """,
                (
                    user_id,
                    symbol,
                    signal_type,
                    int(time.time()),
                    "spot", # generic
                    order_type,
                    quantity,
                    price,
                    execution_mode,
                    json.dumps(payload, ensure_ascii=False),
                    idempotency_key,
                    exchange_id
                ),
            )
            db.commit()
            cur.close()
            
        return jsonify({
            "status": "success",
            "orderid": orderid,
            "message": "Order placed successfully"
        })
    except Exception as e:
        logger.error(f"Place order failed: {str(e)}", exc_info=True)
        return jsonify({"status": "error", "message": str(e)}), 500


@openalgo_blp.route("/orderbook", methods=["POST"])
@login_required
def orderbook():
    try:
        user_id = g.user_id
        
        # In a real impl, fetch from pending_orders WHERE strategy_id = 0
        with get_db_connection() as db:
            cur = db.cursor()
            # Fetch manual orders (strategy_id = 0)
            cur.execute(
                """
                SELECT id, symbol, exchange_id, signal_type, amount, price, order_type, status, created_at
                FROM pending_orders
                WHERE user_id = %s AND strategy_id = 0
                ORDER BY id DESC LIMIT 50
                """,
                (user_id,)
            )
            rows = cur.fetchall() or []
            cur.close()
            
        orders = []
        for r in rows:
            orders.append({
                "orderid": str(r.get("id")),
                "symbol": r.get("symbol"),
                "exchange": r.get("exchange_id", "NSE"),
                "action": "BUY" if r.get("signal_type") == "long" else "SELL",
                "quantity": float(r.get("amount") or 0),
                "price": float(r.get("price") or 0),
                "trigger_price": 0,
                "pricetype": str(r.get("order_type") or "market").upper(),
                "product": "CNC",
                "order_status": r.get("status", "pending"),
                "timestamp": str(r.get("created_at"))
            })
            
        return jsonify({
            "status": "success",
            "data": {
                "orders": orders,
                "statistics": {
                    "total_buy_orders": sum(1 for o in orders if o["action"] == "BUY"),
                    "total_sell_orders": sum(1 for o in orders if o["action"] == "SELL"),
                    "total_completed_orders": sum(1 for o in orders if o["order_status"] in ("complete", "filled")),
                    "total_open_orders": sum(1 for o in orders if o["order_status"] == "pending"),
                    "total_rejected_orders": sum(1 for o in orders if o["order_status"] == "rejected")
                }
            }
        })
    except Exception as e:
        logger.error(f"Orderbook failed: {str(e)}", exc_info=True)
        return jsonify({"status": "error", "message": str(e)}), 500


@openalgo_blp.route("/positionbook", methods=["POST"])
@login_required
def positionbook():
    try:
        user_id = g.user_id
        
        # Read from qd_strategy_positions where strategy_id = 0
        with get_db_connection() as db:
            cur = db.cursor()
            cur.execute(
                """
                SELECT symbol, market_type as market, side, size as quantity, entry_price as avg_entry_price, unrealized_pnl as pnl, current_price
                FROM qd_strategy_positions
                WHERE user_id = %s AND strategy_id = 0 AND size > 0
                """,
                (user_id,)
            )
            rows = cur.fetchall() or []
            cur.close()
            
        positions = []
        for r in rows:
            positions.append({
                "symbol": r.get("symbol"),
                "exchange": r.get("market") or "NSE",
                "product": "CNC",
                "quantity": float(r.get("quantity") or 0),
                "average_price": float(r.get("avg_entry_price") or 0),
                "ltp": float(r.get("current_price") or 0),
                "pnl": float(r.get("pnl") or 0),
                "pnlpercent": 0 # can calculate if needed
            })
            
        return jsonify({
            "status": "success",
            "data": positions
        })
    except Exception as e:
        logger.error(f"Positionbook failed: {str(e)}", exc_info=True)
        return jsonify({"status": "error", "message": str(e)}), 500


@openalgo_blp.route("/tradebook", methods=["POST"])
@login_required
def tradebook():
    try:
        user_id = g.user_id
        
        with get_db_connection() as db:
            cur = db.cursor()
            cur.execute(
                """
                SELECT id, symbol, market_type as market, type as side, amount as quantity, price as fill_price, profit as realized_pnl, created_at
                FROM qd_strategy_trades
                WHERE user_id = %s AND strategy_id = 0
                ORDER BY id DESC LIMIT 50
                """,
                (user_id,)
            )
            rows = cur.fetchall() or []
            cur.close()
            
        trades = []
        for r in rows:
            trades.append({
                "orderid": str(r.get("id")),
                "symbol": r.get("symbol"),
                "exchange": r.get("market", "NSE"),
                "action": "BUY" if r.get("side") == "long" else "SELL",
                "quantity": float(r.get("quantity") or 0),
                "average_price": float(r.get("fill_price") or 0),
                "trade_value": float(r.get("quantity") or 0) * float(r.get("fill_price") or 0),
                "product": "CNC",
                "timestamp": str(r.get("created_at"))
            })
            
        return jsonify({
            "status": "success",
            "data": trades
        })
    except Exception as e:
        logger.error(f"Tradebook failed: {str(e)}", exc_info=True)
        return jsonify({"status": "error", "message": str(e)}), 500

@openalgo_blp.route("/quotes", methods=["POST"])
@login_required
def quotes():
    return jsonify({"status": "success", "data": {}})

@openalgo_blp.route("/multiquotes", methods=["POST"])
@login_required
def multiquotes():
    return jsonify({})

@openalgo_blp.route("/depth", methods=["POST"])
@login_required
def depth():
    return jsonify({"status": "success", "data": {}})

@openalgo_blp.route("/holdings", methods=["POST"])
@login_required
def holdings():
    return jsonify({
        "status": "success",
        "data": {
            "holdings": [],
            "statistics": {
                "totalholdingvalue": 0,
                "totalinvvalue": 0,
                "totalprofitandloss": 0,
                "totalpnlpercentage": 0
            }
        }
    })

@openalgo_blp.route("/basketorder", methods=["POST"])
@login_required
def basketorder():
    return jsonify({"status": "success", "data": []})

@openalgo_blp.route("/cancel_order", methods=["POST"])
@login_required
def cancel_order():
    try:
        body = request.get_json() or {}
        orderid = body.get("orderid")
        user_id = g.user_id
        if not orderid:
            return jsonify({"status": "error", "message": "Missing orderid"}), 400
            
        with get_db_connection() as db:
            cur = db.cursor()
            cur.execute(
                "UPDATE pending_orders SET status = 'canceled' WHERE id = %s AND user_id = %s AND status = 'pending'",
                (orderid, user_id)
            )
            db.commit()
            cur.close()
            
        return jsonify({"status": "success", "message": "Order canceled"})
    except Exception as e:
        logger.error(f"Cancel order failed: {str(e)}", exc_info=True)
        return jsonify({"status": "error", "message": str(e)}), 500

@openalgo_blp.route("/modify_order", methods=["POST"])
@login_required
def modify_order():
    return jsonify({"status": "success", "message": "Modify order not implemented for paper trading yet."})

@openalgo_blp.route("/close_position", methods=["POST"])
@login_required
def close_position():
    return jsonify({"status": "success", "message": "Close position not implemented for paper trading yet."})

@openalgo_blp.route("/close_all_positions", methods=["POST"])
@login_required
def close_all_positions():
    return jsonify({"status": "success", "message": "Close all positions not implemented."})

@openalgo_blp.route("/cancel_all_orders", methods=["POST"])
@login_required
def cancel_all_orders():
    try:
        user_id = g.user_id
        with get_db_connection() as db:
            cur = db.cursor()
            cur.execute(
                "UPDATE pending_orders SET status = 'canceled' WHERE user_id = %s AND strategy_id = 0 AND status = 'pending'",
                (user_id,)
            )
            db.commit()
            cur.close()
        return jsonify({"status": "success", "message": "All orders canceled"})
    except Exception as e:
        logger.error(f"Cancel all orders failed: {str(e)}", exc_info=True)
        return jsonify({"status": "error", "message": str(e)}), 500

@openalgo_blp.route("/gttorderbook", methods=["POST"])
@login_required
def gttorderbook():
    return jsonify({"status": "success", "data": []})

@openalgo_blp.route("/cancel_gtt_order", methods=["POST"])
@login_required
def cancel_gtt_order():
    return jsonify({"status": "success", "message": "GTT not supported yet"})

@openalgo_blp.route("/modify_gtt_order", methods=["POST"])
@login_required
def modify_gtt_order():
    return jsonify({"status": "success", "message": "GTT not supported yet"})
