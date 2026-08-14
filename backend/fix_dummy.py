import re

file_path = "/Users/aditya/Desktop/calculatedrisk/backend/tests/test_phase7_adversarial_retry.py"
with open(file_path, "r") as f:
    content = f.read()

# Fix place_market_order
content = content.replace("""        return LiveOrderResult(
            success=True,
            order_id="broker_order_123",
            filled_quantity=0,
            average_price=0,
            status="confirmed",
            error_message="",
            raw={"id": "broker_order_123"}
        )""", """        return LiveOrderResult(
            exchange_id="calculatedrisk",
            exchange_order_id="broker_order_123",
            filled=0.0,
            avg_price=0.0,
            raw={"id": "broker_order_123"}
        )""")

# Fix wait_for_fill
content = content.replace("""        return LiveOrderResult(
            success=True,
            order_id="broker_order_123",
            filled_quantity=intent.amount,
            average_price=10.0,
            status="filled",
            error_message="",
            raw={"id": "broker_order_123", "status": "filled"}
        )""", """        return FillSnapshot(
            filled_qty=intent.quantity,
            avg_price=10.0,
            status="filled",
            raw={"id": "broker_order_123", "status": "filled"}
        )""")

with open(file_path, "w") as f:
    f.write(content)
