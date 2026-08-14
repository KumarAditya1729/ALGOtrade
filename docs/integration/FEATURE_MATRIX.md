# Feature Matrix

| Feature | Source | Keep | Adapt | Replace | Conflict | Verification |
| ------- | ------ | ---- | ----- | ------- | -------- | ------------ |
| **34 Broker Plugins (Indian/Crypto)** | OpenAlgo | Yes | No | No | No | Check broker auth/orders |
| **Crypto & TradFi (Binance, IBKR)** | QuantDinger | Yes | Yes | No | Yes (Adapter interfaces) | Check adapter loading |
| **Visual Flow Builder** | OpenAlgo | Yes | Yes | No | No | Check UI and execution |
| **In-browser Python IDE** | OpenAlgo | Yes | Yes | No | No | Check execution isolation |
| **Agent Gateway / MCP** | Both | QuantDinger | Yes | OpenAlgo MCP | Yes (Overlapping MCP) | Check MCP tool endpoints |
| **PostgreSQL & Redis DB layer** | QuantDinger | Yes | Yes | OpenAlgo SQLite | Yes (DB Engine) | Check migrations & persistence |
| **Celery / Multi-process Workers** | QuantDinger | Yes | Yes | OpenAlgo ZeroMQ/Threads | Yes (Concurrency Model) | Check job scheduling |
| **React 19 Vite Frontend** | OpenAlgo | Yes | Yes | No | No | Check build and route loads |
| **Prometheus/Grafana Observability**| QuantDinger | Yes | No | OpenAlgo internal tracking | No (Additive) | Check metrics endpoints |
| **Sandbox / Analyzer Mode** | OpenAlgo | Yes | Yes | No | No | Check paper order routing |
| **Options Trading Suite** | OpenAlgo | Yes | Yes | No | No | Check option chain & analytics |
| **Dedicated Backtest Engine** | QuantDinger | Yes | No | No | No | Check strategy backtest run |
