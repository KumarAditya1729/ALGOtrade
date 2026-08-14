import re

file_path = "/Users/aditya/Desktop/calculatedrisk/backend/tests/test_phase7_adversarial_retry.py"
with open(file_path, "r") as f:
    content = f.read()

content = content.replace(
    'monkeypatch.setattr("app.services.live_trading.brokers.calculatedrisk_adapter.CalculatedRiskAdapter.place_market_order", lambda self, intent: self.client.place_market_order(intent), raising=False)',
    'monkeypatch.setattr("app.services.live_trading.brokers.calculatedrisk_adapter.CalculatedRiskAdapter.place_market_order", lambda self, intent: self.client.place_market_order(intent), raising=False)\n    monkeypatch.setattr("app.services.live_trading.brokers.calculatedrisk_adapter.CalculatedRiskAdapter.wait_for_fill", lambda self, intent, order_id, max_wait_sec: self.client.wait_for_fill(intent, order_id, max_wait_sec), raising=False)'
)

with open(file_path, "w") as f:
    f.write(content)
