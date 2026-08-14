from unittest.mock import patch
from app.services.live_trading.brokers.paper_adapter import PaperBrokerAdapter
from app.services.live_trading.contracts import OrderIntent

@patch("app.services.live_trading.brokers.paper_adapter.KlineService.get_kline")
def test_paper_adapter_market_order(mock_get_kline):
    # Mock return: [ {"close": 100.0} ]
    mock_get_kline.return_value = [{"close": 100.0}]
    
    adapter = PaperBrokerAdapter()
    intent = OrderIntent(
        symbol="AAPL",
        side="buy",
        quantity=10,
        price=None,
        exchange_config={"exchange_id": "binance"}
    )
    result = adapter.place_market_order(intent)
    assert result.exchange_id == "paper"
    assert result.exchange_order_id.startswith("paper_")
    
    fill = adapter.wait_for_fill(intent, order_id=result.exchange_order_id)
    assert fill.filled_qty == 10
    assert fill.status == "closed"
    # Market buy slips up 1 bp: 100.0 * 1.0001 = 100.01
    assert fill.avg_price == 100.01
    assert fill.fees_by_ccy == {"USD": 1.0001} # 100.01 * 10 * 0.001
    
@patch("app.services.live_trading.brokers.paper_adapter.KlineService.get_kline")
def test_paper_adapter_limit_order(mock_get_kline):
    mock_get_kline.return_value = [{"close": 140.0}]
    adapter = PaperBrokerAdapter()
    intent = OrderIntent(
        symbol="AAPL",
        side="buy",
        quantity=10,
        price=150.0,
        exchange_config={"exchange_id": "binance"}
    )
    result = adapter.place_limit_order(intent)
    assert result.exchange_id == "paper"
    
    fill = adapter.wait_for_fill(intent, order_id=result.exchange_order_id)
    assert fill.filled_qty == 10
    assert fill.status == "closed"
    assert fill.avg_price == 150.0  # matches limit price
    assert fill.fees_by_ccy == {"USD": 1.5} # 150 * 10 * 0.001

@patch("app.services.live_trading.brokers.paper_adapter.KlineService.get_kline")
def test_paper_adapter_limit_order_no_cross(mock_get_kline):
    # Market price is 160, trying to buy at 150 -> no fill
    mock_get_kline.return_value = [{"close": 160.0}]
    adapter = PaperBrokerAdapter()
    intent = OrderIntent(
        symbol="AAPL",
        side="buy",
        quantity=10,
        price=150.0,
        exchange_config={"exchange_id": "binance"}
    )
    result = adapter.place_limit_order(intent)
    fill = adapter.wait_for_fill(intent, order_id=result.exchange_order_id)
    assert fill.filled_qty == 0
    assert fill.status == "open"
