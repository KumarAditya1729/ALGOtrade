import pytest
from app.services.live_trading.brokers.paper_adapter import PaperBrokerAdapter
from app.services.live_trading.contracts import OrderIntent

def test_paper_simulator_market_order():
    adapter = PaperBrokerAdapter()
    
    intent = OrderIntent(
        symbol="BTC/USD",
        side="buy",
        quantity=1.5,
        price=None, # Market order
        exchange_config={"exchange_id": "paper", "mock_last_price": 60000.0},
        market_type="spot"
    )
    
    # 1. Place order
    res = adapter.place_market_order(intent)
    assert res.exchange_order_id.startswith("paper_")
    
    # 2. Wait for fill
    fill = adapter.wait_for_fill(intent, order_id=res.exchange_order_id)
    
    # Verify fill logic
    assert fill.status == "closed"
    assert fill.filled_qty == 1.5
    assert fill.avg_price == 60000.0 * 1.0001 # Market slippage logic from the simulator (0.0001 for spot)
    assert "USD" in fill.fees_by_ccy
    assert fill.fees_by_ccy["USD"] > 0
    
def test_paper_simulator_limit_order():
    adapter = PaperBrokerAdapter()
    
    intent = OrderIntent(
        symbol="BTC/USD",
        side="buy",
        quantity=2.0,
        price=55000.0,
        exchange_config={"exchange_id": "paper", "mock_last_price": 60000.0},
        market_type="spot"
    )
    
    # 1. Place limit order
    res = adapter.place_limit_order(intent)
    assert res.exchange_order_id.startswith("paper_")
    
    # 2. Wait for fill
    fill = adapter.wait_for_fill(intent, order_id=res.exchange_order_id)
    
    assert fill.status == "open"
    assert fill.filled_qty == 0.0
