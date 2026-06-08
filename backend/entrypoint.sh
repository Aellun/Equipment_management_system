#!/bin/bash
set -e

echo "Running database migrations..."
alembic upgrade head

# Number of uvicorn workers (override with UVICORN_WORKERS). Default 2 for production throughput.
WORKERS="${UVICORN_WORKERS:-2}"

echo "Starting FastAPI server with ${WORKERS} worker(s)..."
exec uvicorn app.main:app --host 0.0.0.0 --port 8000 --workers "${WORKERS}"
