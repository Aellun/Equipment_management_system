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
from app.errands.routers import admin, auth, payments, runners, services, tasks

ERRANDS_MEDIA_DIR = os.environ.get("ERRANDS_MEDIA_DIR", "/app/errands_media")


def init_errands_db() -> None:
    """Create errands tables and apply additive column migrations.

    `create_all` never ALTERs existing tables, so columns added after a DB
    already exists are backfilled here. Each statement is idempotent."""
    Base.metadata.create_all(bind=engine)
    additive = [
        "ALTER TABLE errand_tasks ADD COLUMN IF NOT EXISTS contact_phone VARCHAR(20) NOT NULL DEFAULT ''",
        "ALTER TABLE errand_service_types ADD COLUMN IF NOT EXISTS vertical VARCHAR(40) NOT NULL DEFAULT 'errands'",
    ]
    with engine.begin() as conn:
        for stmt in additive:
            try:
                conn.execute(text(stmt))
            except Exception:  # pragma: no cover — dialects without IF NOT EXISTS
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
