import re

file_path = "/Users/aditya/Desktop/calculatedrisk/backend/tests/test_phase7_adversarial_retry.py"
with open(file_path, "r") as f:
    content = f.read()

# Add fixture
fixture_str = """
@pytest.fixture(autouse=True)
def mock_calculatedrisk_adapter_methods(monkeypatch):
    monkeypatch.setattr("app.services.live_trading.brokers.calculatedrisk_adapter.CalculatedRiskAdapter.find_order_by_client_id", lambda self, cid: self.client.find_order_by_client_id(cid), raising=False)
    monkeypatch.setattr("app.services.live_trading.brokers.calculatedrisk_adapter.CalculatedRiskAdapter.place_market_order", lambda self, intent: self.client.place_market_order(intent), raising=False)
"""

if "def mock_calculatedrisk_adapter_methods" not in content:
    content = content.replace("def mock_conn(monkeypatch):", fixture_str + "\n@pytest.fixture\ndef mock_conn(monkeypatch):")

with open(file_path, "w") as f:
    f.write(content)
