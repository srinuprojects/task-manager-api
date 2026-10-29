#!/bin/sh
set -e

# Apply database migrations before starting the server
alembic upgrade head

# Workers come from WEB_CONCURRENCY. Only Caddy can reach this port, so trusting
# its X-Forwarded-* headers is safe.
exec gunicorn main:app \
    --worker-class uvicorn.workers.UvicornWorker \
    --bind 0.0.0.0:8000 \
    --forwarded-allow-ips "*" \
    --access-logfile - \
    --timeout 60
