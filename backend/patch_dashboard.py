import re

with open("app/routes/dashboard.py", "r") as f:
    content = f.read()

import_stmt = """
        # Real Data Injection
        from app.routes.quick_trade import (
            build_exchange_config, create_exchange_client,
            _fetch_exchange_positions_raw, _parse_positions,
            _fetch_spot_holdings_raw, _fetch_funds_raw, _parse_funds
        )
"""

inject_logic = """
        # --- Inject Real Live Broker Data if available ---
        try:
            with get_db_connection() as db:
                cur = db.cursor()
                cur.execute(
                    "SELECT id, exchange_id, encrypted_config, environment FROM qd_user_exchange_credentials WHERE user_id = ? AND environment = 'live' ORDER BY id DESC",
                    (user_id,)
                )
                creds = cur.fetchall() or []
                cur.close()
            
            # Find an Angel One credential (or the first real credential)
            real_cred = next((c for c in creds if c.get("exchange_id") == "angel"), None)
            if not real_cred and creds:
                real_cred = creds[0]

            if real_cred:
                c_id = real_cred["id"]
                ex_id = real_cred["exchange_id"]
                
                ex_cfg = build_exchange_config(c_id, user_id, {"market_type": "spot"})
                client = create_exchange_client(ex_cfg, market_type="spot")
                
                # Fetch Real Balances
                raw_funds = _fetch_funds_raw(client, ex_cfg)
                parsed_funds = _parse_funds(raw_funds)
                
                real_available = 0.0
                real_equity = 0.0
                if isinstance(parsed_funds, dict):
                    # For Angel One or single asset
                    real_available = float(parsed_funds.get("free") or parsed_funds.get("available") or 0.0)
                    real_equity = real_available
                elif isinstance(parsed_funds, list):
                    for f in parsed_funds:
                        real_available += float(f.get("free") or f.get("available") or 0.0)
                        real_equity += float(f.get("total") or f.get("free") or 0.0)
                
                # Fetch Real Positions (Spot Holdings for Angel One)
                try:
                    raw_pos = _fetch_spot_holdings_raw(client, symbol="") # Will fetch all if client supports it, else we need a symbol. Wait, Angel one get_positions doesn't need symbol.
                except Exception:
                    raw_pos = {"data": []}
                    
                # If Angel One, use _fetch_exchange_positions_raw instead because get_positions gets derivatives + equity
                try:
                    if ex_id == "angel":
                        raw_pos = _fetch_exchange_positions_raw(client, ex_cfg, symbol="", market_type="spot")
                        real_positions = _parse_positions(raw_pos)
                    else:
                        real_positions = []
                except Exception as e:
                    logger.warning(f"Failed to fetch real positions for dashboard: {e}")
                    real_positions = []
                    
                # Calculate real unrealized P&L
                real_unrealized_pnl = 0.0
                real_used_margin = 0.0
                mapped_positions = []
                for p in real_positions:
                    pnl = float(p.get("unrealized_pnl") or 0.0)
                    real_unrealized_pnl += pnl
                    
                    entry = float(p.get("entry_price") or 0.0)
                    size = float(p.get("size") or p.get("qty") or 0.0)
                    real_used_margin += (entry * size)
                    
                    mapped_positions.append({
                        "id": f"live_{p.get('symbol')}",
                        "symbol": p.get("symbol"),
                        "side": p.get("side"),
                        "size": size,
                        "entry_price": entry,
                        "current_price": p.get("mark_price") or entry,
                        "unrealized_pnl": pnl,
                        "pnl_percent": (pnl / (entry * size) * 100) if (entry * size) > 0 else 0,
                        "used_margin": entry * size,
                        "strategy_name": "Live Portfolio",
                        "strategy_id": 0,
                        "leverage": 1.0,
                    })
                
                # Override the simulated metrics with LIVE metrics
                total_initial_capital = 0.0 # reset so equity is just real_equity
                total_equity = real_equity + real_unrealized_pnl
                total_used_margin = real_used_margin
                total_unrealized_pnl = real_unrealized_pnl
                
                # Replace the DB positions with real positions
                current_positions = mapped_positions
                
        except Exception as e:
            logger.error(f"Dashboard real data injection failed: {e}", exc_info=True)
            # fallback to DB
"""

# Replace in content around line 520
# Search for:
#         total_realized_pnl = float(total_realized_pnl_all)
#         total_pnl = float(total_unrealized_pnl + total_realized_pnl)
#         total_equity = float(total_initial_capital + total_pnl)

# We will inject our code right BEFORE that, so it updates the vars.

anchor = "        total_realized_pnl = float(total_realized_pnl_all)"
if anchor in content:
    new_content = content.replace(anchor, import_stmt + "\n" + inject_logic + "\n" + anchor)
    with open("app/routes/dashboard.py", "w") as f:
        f.write(new_content)
    print("Injected real data logic into dashboard.py")
else:
    print("Anchor not found in dashboard.py")
