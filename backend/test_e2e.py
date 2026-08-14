import os
import time
import requests
from app import create_app
from app.utils.auth import generate_token
from app.utils.db import get_db_connection

def run_e2e_test():
    app = create_app()
    with app.app_context():
        # Get first user ID
        with get_db_connection() as db:
            cur = db.cursor()
            cur.execute("SELECT id FROM qd_users LIMIT 1")
            user_row = cur.fetchone()
            if not user_row:
                print("No user found")
                return
            user_id = user_row["id"]
            
            # Ensure the user has an active token so apikey doesn't fail
            cur.execute(
                "SELECT token_prefix FROM qd_agent_tokens WHERE user_id = %s AND status = 'active' LIMIT 1",
                (user_id,)
            )
            token_row = cur.fetchone()
            if not token_row:
                print("Creating a fake API key for test user")
                cur.execute(
                    """
                    INSERT INTO qd_agent_tokens
                      (user_id, name, token_prefix, token_hash, scopes, markets, instruments,
                       paper_only, rate_limit_per_min, max_order_notional, max_daily_notional, status)
                    VALUES
                      (%s, 'Default API Key', 'testprefix12', 'testhash', 'RW', '*', '*', true, 60, 1000000, 5000000, 'active')
                    """,
                    (user_id,)
                )
                db.commit()
            cur.close()
            
        token = generate_token(user_id, "admin", "admin", 1)
        
    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json"
    }
    base_url = "http://localhost:5000"
    
    print("1. Placing paper order...")
    order_data = {
        "apikey": "testprefix12",
        "symbol": "RELIANCE",
        "exchange": "NSE",
        "action": "BUY",
        "quantity": 10,
        "pricetype": "MARKET",
        "product": "MIS"
    }
    r = requests.post(f"{base_url}/api/v1/openalgo/placeorder", headers=headers, json=order_data)
    print(f"Place order: {r.status_code} {r.text}")
    
    time.sleep(2) # Give background worker time to process the order
    
    print("\n2. Checking orderbook...")
    r = requests.post(f"{base_url}/api/v1/openalgo/orderbook", headers=headers, json={})
    print(f"Orderbook: {r.status_code} {r.text[:300]}...")
    
    print("\n3. Checking positionbook...")
    r = requests.post(f"{base_url}/api/v1/openalgo/positionbook", headers=headers, json={})
    print(f"Positionbook: {r.status_code} {r.text[:300]}...")
    
    print("\n4. Closing positions...")
    r = requests.post(f"{base_url}/api/v1/openalgo/close_position", headers=headers, json={"symbol": "RELIANCE"})
    print(f"Close positions: {r.status_code} {r.text}")
    
    time.sleep(2)
    
    print("\n5. Checking tradebook...")
    r = requests.post(f"{base_url}/api/v1/openalgo/tradebook", headers=headers, json={})
    print(f"Tradebook: {r.status_code} {r.text[:300]}...")

if __name__ == "__main__":
    run_e2e_test()
