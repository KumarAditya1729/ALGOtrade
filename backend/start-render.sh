#!/bin/bash
# Start script for Render Free Tier
# Runs Celery and Flask in the same container

echo "Running database migrations..."
python -m app.commands.migrate

echo "Starting Celery worker in the background..."
python -m celery -A app.celery_app:celery_app worker --loglevel=INFO -Q jobs,ai,maintenance &

echo "Starting Flask backend..."
gunicorn -c gunicorn_config.py "run:app" --bind 0.0.0.0:${PORT:-5000}
