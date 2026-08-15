#!/bin/bash
# Start script for Render Free Tier
# Runs Celery and Flask in the same container

echo "Running database migrations..."
python -m app.commands.migrate

echo "Starting Celery worker in the background (concurrency=1 for memory limit)..."
python -m celery -A app.celery_app:celery_app worker --loglevel=INFO -Q jobs,ai,maintenance --concurrency=1 &

echo "Starting Flask backend (threads=2 for memory limit)..."
gunicorn -c gunicorn_config.py "run:app" --bind 127.0.0.1:10001 --workers=1 --threads=2 &

echo "Starting Caddy reverse proxy on port ${PORT:-5000}..."
cat > Caddyfile <<EOF
{
    admin off
}
http://0.0.0.0:${PORT:-5000} {
    handle /ws* {
        reverse_proxy 127.0.0.1:8765
    }
    handle {
        reverse_proxy 127.0.0.1:10001
    }
}
EOF

./caddy run --config Caddyfile
