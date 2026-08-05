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
        # ── Dyzah Hygiene: cleaning bookings ─────────────────────────
        # Cleaning is scheduled at an address for a date and window and priced
        # from property size, not from a pickup→drop-off route.
        "DO $$ BEGIN CREATE TYPE errand_quote_mode AS ENUM ('rooms','unit','survey','distance'); EXCEPTION WHEN duplicate_object THEN NULL; END $$",
        "DO $$ BEGIN CREATE TYPE errand_frequency AS ENUM ('one_off','weekly','fortnightly','monthly'); EXCEPTION WHEN duplicate_object THEN NULL; END $$",
        "ALTER TABLE errand_service_types ADD COLUMN IF NOT EXISTS quote_mode errand_quote_mode NOT NULL DEFAULT 'distance'",
        "ALTER TABLE errand_service_types ADD COLUMN IF NOT EXISTS included_bedrooms INTEGER NOT NULL DEFAULT 2",
        "ALTER TABLE errand_service_types ADD COLUMN IF NOT EXISTS included_bathrooms INTEGER NOT NULL DEFAULT 1",
        "ALTER TABLE errand_tasks ADD COLUMN IF NOT EXISTS service_address VARCHAR(240) NOT NULL DEFAULT ''",
        "ALTER TABLE errand_tasks ADD COLUMN IF NOT EXISTS scheduled_date DATE",
        "ALTER TABLE errand_tasks ADD COLUMN IF NOT EXISTS arrival_window VARCHAR(40) NOT NULL DEFAULT ''",
        "ALTER TABLE errand_tasks ADD COLUMN IF NOT EXISTS frequency errand_frequency NOT NULL DEFAULT 'one_off'",
        "ALTER TABLE errand_tasks ADD COLUMN IF NOT EXISTS bedrooms INTEGER NOT NULL DEFAULT 0",
        "ALTER TABLE errand_tasks ADD COLUMN IF NOT EXISTS bathrooms INTEGER NOT NULL DEFAULT 0",
        "ALTER TABLE errand_tasks ADD COLUMN IF NOT EXISTS quantity INTEGER NOT NULL DEFAULT 1",
        "ALTER TABLE errand_tasks ADD COLUMN IF NOT EXISTS extras VARCHAR(300) NOT NULL DEFAULT ''",
        "ALTER TABLE errand_tasks ADD COLUMN IF NOT EXISTS access_notes TEXT NOT NULL DEFAULT ''",
        "ALTER TABLE errand_tasks ADD COLUMN IF NOT EXISTS size_fee DOUBLE PRECISION NOT NULL DEFAULT 0",
        "ALTER TABLE errand_tasks ADD COLUMN IF NOT EXISTS extras_fee DOUBLE PRECISION NOT NULL DEFAULT 0",
        "ALTER TABLE errand_tasks ADD COLUMN IF NOT EXISTS frequency_discount DOUBLE PRECISION NOT NULL DEFAULT 0",
        # Site-survey requests reuse the hygiene enquiry pipeline.
        "DO $$ BEGIN CREATE TYPE errand_hygiene_enquiry_kind AS ENUM ('supply','survey'); EXCEPTION WHEN duplicate_object THEN NULL; END $$",
        "ALTER TABLE errand_hygiene_enquiries ADD COLUMN IF NOT EXISTS kind errand_hygiene_enquiry_kind NOT NULL DEFAULT 'supply'",
        "ALTER TABLE errand_hygiene_enquiries ADD COLUMN IF NOT EXISTS site_type VARCHAR(80) NOT NULL DEFAULT ''",
        "ALTER TABLE errand_hygiene_enquiries ADD COLUMN IF NOT EXISTS site_size VARCHAR(80) NOT NULL DEFAULT ''",
        "ALTER TABLE errand_hygiene_enquiries ADD COLUMN IF NOT EXISTS locations VARCHAR(40) NOT NULL DEFAULT ''",
        # ── Social login ─────────────────────────────────────────────
        # Accounts created through Google/Facebook/etc. have no password, so
        # the hash column must tolerate an empty value on existing databases.
        "ALTER TABLE errand_users ADD COLUMN IF NOT EXISTS avatar_url VARCHAR(500) NOT NULL DEFAULT ''",
        "ALTER TABLE errand_users ALTER COLUMN hashed_password SET DEFAULT ''",
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
