-- Create the execution_attempts table for durable broker reconciliation ledger
CREATE TABLE IF NOT EXISTS execution_attempts (
    id SERIAL PRIMARY KEY,
    pending_order_id INTEGER NOT NULL REFERENCES pending_orders(id) ON DELETE CASCADE,
    client_order_id VARCHAR(100) NOT NULL,
    attempt_number INTEGER NOT NULL DEFAULT 1,
    broker_order_id VARCHAR(100) DEFAULT '',
    submitted_at TIMESTAMP NOT NULL DEFAULT NOW(),
    response_received_at TIMESTAMP,
    status VARCHAR(50) NOT NULL,
    error TEXT DEFAULT ''
);

CREATE INDEX IF NOT EXISTS idx_exec_attempts_pending_order_id ON execution_attempts(pending_order_id);
CREATE INDEX IF NOT EXISTS idx_exec_attempts_client_order_id ON execution_attempts(client_order_id);
CREATE INDEX IF NOT EXISTS idx_exec_attempts_status ON execution_attempts(status);

-- Ensure a deterministic identity per attempt
ALTER TABLE execution_attempts ADD CONSTRAINT uq_exec_attempt UNIQUE (pending_order_id, client_order_id, attempt_number);

-- We might also want to append this to init.sql so that new setups get it properly
