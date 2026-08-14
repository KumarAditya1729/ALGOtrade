"""Trading (class T) — paper-only by default, hard-gated for live execution.

Live execution from agents requires *all* of the following:
  1. Token has scope `T`.
  2. Token has `paper_only=false` (operator must flip explicitly).
  3. Server-side env `AGENT_LIVE_TRADING_ENABLED=true` (deployment kill switch).

Until live is unlocked, this endpoint records orders to `qd_agent_paper_orders`
using the latest market price as the simulated fill — so AI workflows can
exercise the round trip without ever touching exchange credentials.
"""
from __future__ import annotations

import os
import time
import uuid
from typing import Any

from app.services.kline import KlineService
from app.utils.agent_auth import (
    SCOPE_T, agent_required, current_token, current_user_id,
    instrument_allowed, market_allowed, paper_only, with_idempotency,
)
from app.utils.agent_jobs import record_completed_job
from app.utils.db import get_db_connection
from app.utils.logger import get_logger
from flask import request

from . import agent_v1_bp
from ._helpers import envelope, error, get_json_or_400

logger = get_logger(__name__)
_kline = KlineService()
_ORDER_FIELDS = {
    "market", "symbol", "side", "qty", "order_type", "limit_price",
    "credential_id", "market_type", "leverage", "margin_mode", "tp_price", "sl_price",
}


def _live_trading_kill_switch() -> bool:
    return os.getenv("AGENT_LIVE_TRADING_ENABLED", "false").lower() in ("1", "true", "yes")


def _last_price(market: str, symbol: str) -> float | None:
    try:
        rows = _kline.get_kline(market=market, symbol=symbol, timeframe="1m", limit=1) or []
        if not rows:
            return None
        last = rows[-1]
        if isinstance(last, dict):
            for k in ("close", "c", "Close"):
                v = last.get(k)
                if v is not None:
                    return float(v)
        return None
    except Exception as exc:
        logger.warning(f"agent_v1 quick_trade last_price failed: {exc}")
        return None




def _record_paper_order(*, body: dict, fill_price: float | None, status: str, note: str = "") -> dict:
    import uuid

    order_uid = uuid.uuid4().hex
    market = (body.get("market") or "").strip()
    symbol = (body.get("symbol") or "").strip()
    side = (body.get("side") or "").strip().lower()
    order_type = (body.get("order_type") or body.get("orderType") or "market").strip().lower()
    qty = float(body.get("qty") or body.get("quantity") or 0)
    limit_price = body.get("limit_price") or body.get("limitPrice")
    if limit_price is not None:
        limit_price = float(limit_price)

    fill_value = (fill_price * qty) if (fill_price is not None and qty) else None

    with get_db_connection() as db:
        cur = db.cursor()
        cur.execute(
            """
            INSERT INTO qd_agent_paper_orders
              (order_uid, user_id, agent_token_id, market, symbol, side, order_type,
               qty, limit_price, fill_price, fill_value, status, note)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            """,
            (
                order_uid, current_user_id(), int(current_token().get("id") or 0),
                market, symbol, side, order_type,
                qty, limit_price, fill_price, fill_value, status, note,
            ),
        )
        db.commit()
        cur.close()

    return {
        "order_uid": order_uid,
        "market": market,
        "symbol": symbol,
        "side": side,
        "order_type": order_type,
        "qty": qty,
        "limit_price": limit_price,
        "fill_price": fill_price,
        "fill_value": fill_value,
        "status": status,
        "paper": True,
        "note": note,
    }


def _reserve_live_notional(notional: float) -> tuple[bool, dict]:
    token_id = int(current_token().get("id") or 0)
    user_id = current_user_id()
    key = (request.headers.get("Idempotency-Key") or "").strip()
    with get_db_connection() as db:
        cur = db.cursor()
        cur.execute(
            """
            SELECT max_order_notional, max_daily_notional
            FROM qd_agent_tokens
            WHERE id = %s AND user_id = %s
            FOR UPDATE
            """,
            (token_id, user_id),
        )
        limits = cur.fetchone() or {}
        per_order = float(limits.get("max_order_notional") or 1000)
        daily = float(limits.get("max_daily_notional") or 5000)
        if notional > per_order:
            db.rollback()
            cur.close()
            return False, {
                "reason": "max_order_notional",
                "estimated_notional": notional,
                "limit": per_order,
            }
        cur.execute(
            """
            SELECT COALESCE(SUM(notional), 0) AS used
            FROM qd_agent_notional_reservations
            WHERE agent_token_id = %s
              AND created_at >= date_trunc('day', NOW())
              AND status IN ('reserved', 'executed')
            """,
            (token_id,),
        )
        used = float((cur.fetchone() or {}).get("used") or 0)
        if used + notional > daily:
            db.rollback()
            cur.close()
            return False, {
                "reason": "max_daily_notional",
                "estimated_notional": notional,
                "used_today": used,
                "limit": daily,
            }
        cur.execute(
            """
            INSERT INTO qd_agent_notional_reservations
              (user_id, agent_token_id, idempotency_key, notional, status)
            VALUES (%s, %s, %s, %s, 'reserved')
            ON CONFLICT (agent_token_id, idempotency_key) DO NOTHING
            """,
            (user_id, token_id, key, notional),
        )
        db.commit()
        cur.close()
    return True, {
        "estimated_notional": notional,
        "used_today_before": used,
        "max_order_notional": per_order,
        "max_daily_notional": daily,
    }


def _finish_live_notional(status: str) -> None:
    with get_db_connection() as db:
        cur = db.cursor()
        cur.execute(
            """
            UPDATE qd_agent_notional_reservations
            SET status = %s, updated_at = NOW()
            WHERE agent_token_id = %s AND idempotency_key = %s
            """,
            (
                status,
                int(current_token().get("id") or 0),
                (request.headers.get("Idempotency-Key") or "").strip(),
            ),
        )
        db.commit()
        cur.close()


def _dispatch_to_canonical_pipeline(body: dict, user_id: int, execution_mode: str) -> dict:
    from app.services.strategy_runtime.order_intents import OrderIntentService
    from app.utils.db import get_db_connection
    import time
    import uuid
    import json

    credential_id = int(body.get("credential_id") or body.get("credentialId") or 0)
    market = (body.get("market") or "").strip()
    symbol = (body.get("symbol") or "").strip()
    side = (body.get("side") or "").strip().lower()
    order_type = (body.get("order_type") or body.get("orderType") or "market").strip().lower()
    qty = float(body.get("qty") or body.get("quantity") or body.get("amount") or 0)
    limit_price = body.get("limit_price") or body.get("limitPrice") or body.get("price")
    limit_price_f = float(limit_price or 0)
    market_type = (body.get("market_type") or body.get("marketType") or "").strip().lower()
    leverage = int(body.get("leverage") or 1)

    if market_type in ("futures", "future", "perp", "perpetual"):
        market_type = "swap"
    if market_type not in ("spot", "swap"):
        market_type = "swap" if leverage > 1 else "spot"
        
    client_order_id = f"qa{str(int(time.time()))[-6:]}{uuid.uuid4().hex[:8]}"
    idempotency_key = f"agent:{user_id}:{client_order_id}"

    # 1. Create Order Intent
    service = OrderIntentService(strategy_id=0, strategy_run_id=0)
    intent = service.create_intent(
        idempotency_key=idempotency_key,
        symbol=symbol,
        side=side,
        market_type=market_type,
        order_type=order_type,
        quantity=qty,
        limit_price=limit_price_f,
        client_order_id=client_order_id,
    )

    # 2. Insert into pending_orders (canonical queue)
    payload = {
        "strategy_id": 0,
        "strategy_run_id": 0,
        "order_intent_id": intent.id,
        "idempotency_key": idempotency_key,
        "symbol": symbol,
        "signal_type": f"open_{'long' if side == 'buy' else 'short'}",
        "market_type": market_type,
        "amount": qty,
        "price": limit_price_f if order_type == 'limit' else float(_last_price(market, symbol) or 0),
        "limit_price": limit_price_f,
        "order_type": order_type,
        "execution_mode": execution_mode,
        "client_order_id": client_order_id,
        "credential_id": credential_id,
        "exchange_id": market,
        "leverage": leverage
    }

    with get_db_connection() as db:
        cur = db.cursor()
        cur.execute(
            """
            INSERT INTO pending_orders
              (user_id, strategy_id, symbol, signal_type, signal_ts, market_type,
               order_type, amount, price, execution_mode, status, priority,
               attempts, max_attempts, last_error, payload_json, strategy_run_id,
               order_intent_id, idempotency_key, created_at, updated_at, exchange_id)
            VALUES
              (%s, 0, %s, %s, %s, %s, %s, %s, %s, %s, 'pending', 0,
               0, 10, '', %s, 0, %s, %s, NOW(), NOW(), %s)
            ON CONFLICT (idempotency_key) DO NOTHING
            RETURNING id
            """,
            (
                user_id,
                symbol,
                payload["signal_type"],
                int(time.time()),
                market_type,
                order_type,
                qty,
                payload["price"],
                execution_mode,
                json.dumps(payload, ensure_ascii=False),
                intent.id,
                idempotency_key,
                market
            ),
        )
        row = cur.fetchone() or {}
        db.commit()
        cur.close()
    
    pending_id = int(row.get("id") or 0)
    
    # 3. Wait synchronously for the worker to process the order (for MCP UX)
    import time
    start = time.time()
    final_status = "pending"
    exchange_order_id = ""
    filled = 0.0
    avg_price = 0.0
    
    while time.time() - start < 15.0:
        time.sleep(0.5)
        with get_db_connection() as db:
            cur = db.cursor()
            cur.execute("SELECT status, exchange_order_id, filled, avg_price FROM pending_orders WHERE id = %s", (pending_id,))
            row = cur.fetchone()
            cur.close()
        
        if row:
            final_status = row["status"]
            if final_status not in ("pending", "processing", "syncing"):
                exchange_order_id = row.get("exchange_order_id") or ""
                filled = float(row.get("filled") or 0.0)
                avg_price = float(row.get("avg_price") or 0.0)
                break

    return {
        "pending_order_id": pending_id,
        "exchange_order_id": exchange_order_id,
        "market": market,
        "symbol": symbol,
        "side": side,
        "order_type": order_type,
        "qty": qty,
        "limit_price": limit_price_f if order_type == "limit" else None,
        "filled": filled,
        "avg_price": avg_price,
        "status": final_status,
        "paper": execution_mode == "paper",
    }

@agent_v1_bp.route("/quick-trade/orders", methods=["POST"])
@agent_required(SCOPE_T)
def place_order():
    """Place an order. Paper-only unless explicitly unlocked (see module doc)."""
    body, err = get_json_or_400()
    if err:
        return err
    unsupported = sorted(set(body) - _ORDER_FIELDS)
    if unsupported:
        return error(400, f"Unsupported order fields: {', '.join(unsupported)}")

    market = (body.get("market") or "").strip()
    symbol = (body.get("symbol") or "").strip()
    side = (body.get("side") or "").strip().lower()
    qty = body.get("qty")
    order_type = str(body.get("order_type") or "market").strip().lower()

    if not market or not symbol:
        return error(400, "market and symbol are required")
    if side not in ("buy", "sell"):
        return error(400, "side must be 'buy' or 'sell'")
    try:
        qty_f = float(qty)
        if qty_f <= 0:
            raise ValueError
    except Exception:
        return error(400, "qty must be a positive number")
    if order_type not in {"market", "limit"}:
        return error(400, "order_type must be 'market' or 'limit'")
    if order_type == "limit":
        try:
            if float(body.get("limit_price") or 0) <= 0:
                raise ValueError
        except (TypeError, ValueError):
            return error(400, "limit_price is required for limit orders")

    body = dict(body)
    body["qty"] = qty_f
    body["order_type"] = order_type

    if not market_allowed(market):
        return error(403, f"Market not allowed: {market}", http=403)
    if not instrument_allowed(symbol):
        return error(403, f"Instrument not allowed: {symbol}", http=403)

    with with_idempotency("quick_trade_order") as existing:
        if existing:
            return envelope({
                "duplicate": True,
                "previous": existing.get("result"),
            }, message="idempotent replay")

    if not paper_only() and not _live_trading_kill_switch():
        return error(
            501,
            "Live agent trading is disabled by AGENT_LIVE_TRADING_ENABLED",
            http=501,
        )

    execution_mode = "live" if not paper_only() else "paper"
    
    if execution_mode == "live":
        reference_price = float(body.get("limit_price") or 0) if order_type == "limit" else float(
            _last_price(market, symbol) or 0
        )
        if reference_price <= 0:
            return error(400, "A current market price is required to enforce live notional limits")
        notional = qty_f * reference_price
        reserved, limit_state = _reserve_live_notional(notional)
        if not reserved:
            return error(
                403,
                "Live agent trading notional limit exceeded",
                details=limit_state,
                http=403,
            )
            
    try:
        result = _dispatch_to_canonical_pipeline(body=body, user_id=current_user_id(), execution_mode=execution_mode)
    except Exception as exc:
        if execution_mode == "live":
            _finish_live_notional("failed")
        logger.error(f"agent_v1 quick_trade failed: {exc}", exc_info=True)
        return error(500, "quick_trade failed", details=str(exc), http=500)
        
    if execution_mode == "live":
        _finish_live_notional("executed")
        result["notional_policy"] = limit_state
        
    record_completed_job(
        user_id=current_user_id(),
        agent_token_id=int(current_token().get("id") or 0),
        kind="quick_trade_order",
        request_payload=body,
        result=result,
        idempotency_key=request.headers.get("Idempotency-Key"),
    )
    return envelope(result, message=f"{execution_mode}-order")

@agent_v1_bp.route("/quick-trade/kill-switch", methods=["POST"])
@agent_v1_bp.route("/quick-trade/kill-switch", methods=["POST"])
@agent_required(SCOPE_T)
def kill_switch():
    """Best-effort cancel agent orders and revoke every tenant T token."""
    body = request.get_json(silent=True) or {}
    if body.get("confirm") is not True:
        return error(400, "confirm=true is required for the emergency kill switch")
    user_id = current_user_id()
    live_cancelled = 0
    live_failures: list[dict] = []
    with get_db_connection() as db:
        cur = db.cursor()
        cur.execute(
            """
            SELECT id, credential_id, symbol, market_type, exchange_order_id, raw_result
            FROM qd_quick_trades
            WHERE user_id = %s AND source = 'agent_mcp'
              AND status IN ('submitted', 'partial', 'partially_filled')
              AND COALESCE(exchange_order_id, '') <> ''
            ORDER BY id DESC
            """,
            (user_id,),
        )
        live_rows = cur.fetchall() or []
        cur.close()

    for row in live_rows:
        try:
            from app.services.pending_orders.live_order_phases import cancel_live_limit_order
            from app.services.quick_trade.credentials import build_exchange_config, create_exchange_client

            market_type = str(row.get("market_type") or "swap")
            config = build_exchange_config(int(row.get("credential_id") or 0), user_id, {
                "market_type": market_type,
            })
            client = create_exchange_client(config, market_type=market_type)
            raw = row.get("raw_result") or {}
            if not isinstance(raw, dict):
                raw = {}
            metadata = raw.get("_quick_trade") or {}
            outcome = cancel_live_limit_order(
                client=client,
                symbol=str(row.get("symbol") or ""),
                order_id=str(row.get("exchange_order_id") or ""),
                client_order_id=str(metadata.get("client_order_id") or ""),
                market_type=market_type,
                exchange_config=config,
            )
            if outcome is None:
                raise ValueError("exchange client does not support cancellation")
            with get_db_connection() as db:
                cur = db.cursor()
                cur.execute(
                    "UPDATE qd_quick_trades SET status = 'cancelled' WHERE id = %s AND user_id = %s",
                    (row["id"], user_id),
                )
                db.commit()
                cur.close()
            live_cancelled += 1
        except Exception as exc:
            live_failures.append({
                "trade_id": row.get("id"),
                "exchange_order_id": row.get("exchange_order_id"),
                "error": str(exc)[:300],
            })

    with get_db_connection() as db:
        cur = db.cursor()
        cur.execute(
            """
            UPDATE qd_agent_paper_orders
            SET status = 'cancelled', note = COALESCE(note,'') || ' [kill_switch]'
            WHERE user_id = %s AND status NOT IN ('filled','cancelled','rejected')
            """,
            (user_id,),
        )
        paper_affected = cur.rowcount
        cur.execute(
            """
            UPDATE qd_agent_tokens
            SET status = 'revoked'
            WHERE user_id = %s AND status = 'active'
              AND (',' || UPPER(scopes) || ',') LIKE '%%,T,%%'
            """,
            (user_id,),
        )
        revoked = cur.rowcount
        db.commit()
        cur.close()
    return envelope({
        "cancelled_open_paper_orders": int(paper_affected or 0),
        "cancelled_live_agent_orders": live_cancelled,
        "live_cancel_failures": live_failures,
        "revoked_t_tokens": int(revoked or 0),
        "manual_review_required": bool(live_failures),
    }, message="emergency-stop")
