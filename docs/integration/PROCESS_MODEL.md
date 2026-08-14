# Process Model

This document outlines the background processes, workers, queues, and execution boundaries for the unified platform.

## 1. Web / API Process (Gunicorn/Flask)
- **Responsibilities**: HTTP request handling, authentication, configuration, serving frontend (React 19), receiving Webhook signals, dispatching commands to workers.
- **Rules**: Must be stateless. Cannot run long-lived trading loops, blocking backtests, or heavy WebSocket fan-out. State must be durably committed to PostgreSQL or Redis jobs queue before acknowledging the request.

## 2. Trading Worker
- **Responsibilities**: Strategy runtimes, broker session maintenance, active order lifecycle, reconciliation, and position management.
- **Rules**: Explicit separation between `PAPER` and `LIVE` execution environments. Reconciles state continuously against broker API. If it crashes, state is recovered from PostgreSQL and broker queries upon restart.

## 3. Celery Workers (Finite Jobs)
- **Responsibilities**: AI market research, backtesting runs, experiment simulations, large report generation, and data migrations.
- **Rules**: Jobs must be idempotent and finite. Dedicated queues should exist for high-priority jobs (e.g., AI inference, immediate alerts) versus low-priority jobs (historical backtests).

## 4. Scheduler / Celery Beat
- **Responsibilities**: Triggering cron-like jobs (e.g., daily PnL snapshot, scheduled AI research, portfolio sync).
- **Rules**: Singleton process using Redis locks to prevent duplicate scheduler execution. Never executes the job directly, only queues it for Celery.

## 5. Market-Data / WebSocket Worker
- **Responsibilities**: Managing outbound WebSocket connections to brokers (combining OpenAlgo's 34 brokers + QuantDinger's crypto exchanges). 
- **Rules**: Broadcasts normalized ticks via ZeroMQ or Redis Pub/Sub to the `trading-worker` and `API process` (for frontend streaming). Must auto-reconnect and handle failover gracefully.

## 6. Redis Architecture
- **Cache Redis**: Ephemeral data, rate limiting, UI session state, active price quotes.
- **Job Redis**: Transport and coordination infrastructure for Celery queues and distributed locks. It is NOT the source of truth for durable state. A Redis outage must never cause order, position, or authorization state to be lost; all durable state must reside in PostgreSQL.

## 7. AI Job Execution
- **Responsibilities**: Handling MCP tool requests, strategy code generation, agent workflows.
- **Rules**: Agent Gateway handles authorization. Live execution requires `AGENT_LIVE_TRADING_ENABLED=true` and explicit user-granted tokens. AI jobs run in the Celery worker and are bounded by timeouts and sandboxing.

## 8. Failure and Retry Semantics
- **Database**: PostgreSQL transactions with rollback for integrity.
- **Orders**: Idempotency keys used for all broker order submissions to prevent duplicate execution during network failures.
- **Workers**: Managed by Docker/systemd with auto-restart. State recovered from durable storage upon boot.

## 9. Prevention of Conflicts
- **Duplicate Orders**: Internal idempotency keys (UUIDs) are used for order submissions. However, this does not guarantee external brokers honor `client_order_id`. The worker must reconcile ambiguous submission outcomes against the broker before retrying.
- **Duplicate Schedulers**: Distributed locks in Redis ensure only one beat/scheduler process evaluates triggers.
- **State Contention**: Strategies use leases in PostgreSQL to ensure only one worker claims a strategy instance at any time.
