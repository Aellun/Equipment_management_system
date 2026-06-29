#!/bin/bash
set -e

echo "Running database migrations..."
alembic upgrade head

echo "Seeding store catalog..."
python -m app.seed_shop || echo "Store seed skipped/failed (continuing)."

echo "Seeding Errands & Hygiene catalog + demo users..."
python -m app.errands.seed || echo "Errands seed skipped/failed (continuing)."

# Number of uvicorn workers (override with UVICORN_WORKERS). Default 2 for production throughput.
WORKERS="${UVICORN_WORKERS:-2}"

echo "Starting FastAPI server with ${WORKERS} worker(s)..."
exec uvicorn app.main:app --host 0.0.0.0 --port 8000 --workers "${WORKERS}"
