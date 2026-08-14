#!/bin/bash
# Start script for Render Free Tier
# Runs Celery and Uvicorn in the same container

echo "Running database migrations..."
alembic upgrade head

echo "Starting Celery worker in the background..."
celery -A app.workers.trading.celery_app worker --loglevel=info &

echo "Starting FastAPI backend..."
uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-5000}
