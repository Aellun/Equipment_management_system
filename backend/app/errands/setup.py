"""Errands/Hygiene domain bootstrap for the unified Dyzah backend.

The errands domain runs on its OWN sync SQLAlchemy engine (psycopg) against the
SAME Postgres database as the async main app. FastAPI executes the sync route
handlers in a threadpool, so we can simply include the routers into the main
async app — no async rewrite required.
"""
import os

from fastapi import FastAPI
from sqlalchemy import text

from app.errands.core.db import Base, engine
from app.errands import models  # noqa: F401 — registers errands tables on Base.metadata
from app.errands.routers import admin, auth, hygiene, payments, runners, services, tasks

ERRANDS_MEDIA_DIR = os.environ.get("ERRANDS_MEDIA_DIR", "/app/errands_media")


def init_errands_db() -> None:
    """Create errands tables and apply additive column migrations.

    `create_all` never ALTERs existing tables, so columns added after a DB
    already exists are backfilled here. Each statement is idempotent."""
    Base.metadata.create_all(bind=engine)
    additive = [
        "ALTER TABLE errand_tasks ADD COLUMN IF NOT EXISTS contact_phone VARCHAR(20) NOT NULL DEFAULT ''",
        "ALTER TABLE errand_service_types ADD COLUMN IF NOT EXISTS vertical VARCHAR(40) NOT NULL DEFAULT 'errands'",
        # Escrow → direct payment migration: payments now settle straight to the
        # admin M-Pesa account, so the old escrow state machine collapses into a
        # simple payment status.
        "DO $$ BEGIN CREATE TYPE errand_payment_status AS ENUM ('pending','paid','failed','refunded'); EXCEPTION WHEN duplicate_object THEN NULL; END $$",
        "ALTER TABLE errand_payments ADD COLUMN IF NOT EXISTS payment_status errand_payment_status NOT NULL DEFAULT 'pending'",
        "UPDATE errand_payments SET payment_status = CASE"
        " WHEN escrow_status::text IN ('held','released') THEN 'paid'::errand_payment_status"
        " WHEN escrow_status::text = 'failed' THEN 'failed'::errand_payment_status"
        " WHEN escrow_status::text = 'refunded' THEN 'refunded'::errand_payment_status"
        " ELSE 'pending'::errand_payment_status END",
        "ALTER TABLE errand_payments DROP COLUMN IF EXISTS escrow_status",
    ]
    # One transaction per statement: a failed statement (e.g. the backfill once
    # the legacy column is gone) must not poison the ones after it.
    for stmt in additive:
        try:
            with engine.begin() as conn:
                conn.execute(text(stmt))
        except Exception:  # pragma: no cover — already applied / dialect quirk
            pass
    os.makedirs(ERRANDS_MEDIA_DIR, exist_ok=True)


def include_errands_routers(app: FastAPI) -> None:
    """Mount all errands/hygiene routers onto the main app."""
    app.include_router(auth.router)
    app.include_router(services.router)
    app.include_router(tasks.router)
    app.include_router(payments.router)
    app.include_router(runners.router)
    app.include_router(admin.router)
    app.include_router(hygiene.router)
