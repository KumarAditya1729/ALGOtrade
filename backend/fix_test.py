import re
import os

file_path = "/Users/aditya/Desktop/calculatedrisk/backend/tests/test_phase7_adversarial_retry.py"
with open(file_path, "r") as f:
    content = f.read()

content = content.replace("(autouse=True)", "@pytest.fixture(autouse=True)")
content = content.replace("def mock_conn(monkeypatch):", "@pytest.fixture\ndef mock_conn(monkeypatch):")
content = content.replace("def worker(mock_conn, monkeypatch):", "@pytest.fixture\ndef worker(mock_conn, monkeypatch):")
content = content.replace("def test_timeout_after_broker_acceptance", "\ndef test_timeout_after_broker_acceptance")
content = content.replace("def test_timeout_before_broker_acceptance", "\ndef test_timeout_before_broker_acceptance")
content = content.replace("def test_reconciliation_failure_does_not_resubmit", "\ndef test_reconciliation_failure_does_not_resubmit")

with open(file_path, "w") as f:
    f.write(content)
