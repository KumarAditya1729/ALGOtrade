# Architecture Forensics Report

This document compares the architecture of OpenAlgo and QuantDinger across various layers.

## Backend
- **OpenAlgo**: Python 3.12+ backend using Flask 3.0, SQLAlchemy 2.0, Flask-SocketIO for WebSockets, and ZeroMQ for message passing. Emphasizes an all-in-one instance architecture (no separate DB/Redis containers required by default, uses SQLite + DuckDB).
- **QuantDinger**: Python 3.12+ backend using Flask, Gunicorn, and Celery for background jobs. It enforces a strict separation of HTTP workers from long-lived trading loops. Requires PostgreSQL 18 and Redis 8.

## Frontend
- **OpenAlgo**: Monolithic React 19 SPA (in `frontend/` folder) built with TypeScript, Vite, Tailwind CSS 4.0, shadcn/ui. Uses TanStack Query and Zustand.
- **QuantDinger**: Frontend is maintained in separate repositories (`QuantDinger Frontend`, `QuantDinger Mobile`). Not present in this repo. The backend exposes APIs for clients.

## Database
- **OpenAlgo**: SQLite for transactional data (main, logs, latency, health, sandbox). DuckDB for historical market data.
- **QuantDinger**: PostgreSQL (via SQLAlchemy) and Redis (cache & celery jobs). Uses Alembic for migrations.

## Trading
- **OpenAlgo**: Extensive broker coverage (34 plugins). Focus on Indian markets + Delta Exchange. Features order splitting, action center (order approval workflow), and an execution API (`/api/v1`).
- **QuantDinger**: Crypto-focused (Binance, OKX, Bitget, Bybit, Gate, HTX) plus IBKR and Alpaca. Separation of trading worker processes from API handling.

## Market Data
- **OpenAlgo**: Real-time via WebSocket proxy (ZMQ). DuckDB historical data. Unified across brokers.
- **QuantDinger**: Providers/adapters layer (`app/data_sources/` and `app/data_providers/`).

## Strategy
- **OpenAlgo**: Python strategy host in browser (`/python`), no-code builder (`/flow`). Strategies run alongside the app.
- **QuantDinger**: Dedicated long-lived strategy runtimes via the `trading-worker`. Strategy API V2 intents.

## Backtesting
- **OpenAlgo**: Supported through Sandbox/Analyzer Mode API and likely custom python scripts.
- **QuantDinger**: Dedicated backtest engine in `services/backtest_engine/`.

## AI
- **OpenAlgo**: MCP Server integration.
- **QuantDinger**: Extensive AI tooling including an Agent Gateway (`/api/agent/v1`) and an MCP server. Support for LLM providers (OpenRouter, OpenAI, DeepSeek, Grok, etc.). Includes strict permission checks for live trading.

## Infrastructure
- **OpenAlgo**: Standalone Python process or basic Docker. Uses ZeroMQ.
- **QuantDinger**: Docker Compose based (migration, backend, trading-worker, scheduler-worker, celery-worker, beat).

## Observability
- **OpenAlgo**: Internal DB-backed tracking (Latency Monitor, Traffic Monitor, PnL Tracker).
- **QuantDinger**: Prometheus + Grafana + Alertmanager integration natively. Structured JSON logs.

## Security
- **OpenAlgo**: Argon2, Fernet token encryption, manual IP bans, basic rate limiting.
- **QuantDinger**: Non-root containers, read-only root FS, dropped capabilities, rate limiting, audit logs.
