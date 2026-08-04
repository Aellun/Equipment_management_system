"""Dyzah Events storefront: hire rates on stock + customer quote requests

Revision ID: 010
Revises: 009
Create Date: 2026-08-04 06:00:00.000000
"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "010"
down_revision: Union[str, None] = "009"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # ── Storefront fields on stock ────────────────────────────────
    # `is_public` defaults to false: nothing appears on the public site until
    # someone deliberately publishes it.
    op.add_column("equipment", sa.Column("daily_rate", sa.Numeric(12, 2), nullable=True))
    op.add_column("equipment", sa.Column("description", sa.Text(), nullable=True))
    op.add_column("equipment", sa.Column("image_url", sa.String(500), nullable=True))
    op.add_column(
        "equipment",
        sa.Column("is_public", sa.Boolean(), nullable=False, server_default=sa.false()),
    )

    # ── Customer quote requests ───────────────────────────────────
    # Create the types once, then reference them with create_type=False —
    # otherwise create_table tries to emit CREATE TYPE a second time.
    sa.Enum(
        "New", "Quoted", "Confirmed", "Completed", "Cancelled", name="quotestatus"
    ).create(op.get_bind(), checkfirst=True)
    sa.Enum("Delivery", "Collection", name="fulfilmentmethod").create(
        op.get_bind(), checkfirst=True
    )
    quote_status = postgresql.ENUM(
        "New", "Quoted", "Confirmed", "Completed", "Cancelled",
        name="quotestatus", create_type=False,
    )
    fulfilment = postgresql.ENUM(
        "Delivery", "Collection", name="fulfilmentmethod", create_type=False
    )

    op.create_table(
        "rental_quotes",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("reference", sa.String(20), nullable=False),
        sa.Column("contact_name", sa.String(120), nullable=False),
        sa.Column("contact_phone", sa.String(30), nullable=False, server_default=""),
        sa.Column("contact_email", sa.String(160), nullable=False, server_default=""),
        sa.Column("organisation", sa.String(160), nullable=False, server_default=""),
        sa.Column("event_type", sa.String(80), nullable=False, server_default=""),
        sa.Column("start_date", sa.Date(), nullable=False),
        sa.Column("end_date", sa.Date(), nullable=False),
        sa.Column("guest_count", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("fulfilment", fulfilment, nullable=False, server_default="Delivery"),
        sa.Column("venue", sa.String(240), nullable=False, server_default=""),
        sa.Column("notes", sa.Text(), nullable=False, server_default=""),
        sa.Column("estimated_total", sa.Numeric(12, 2), nullable=True),
        sa.Column("quoted_total", sa.Numeric(12, 2), nullable=True),
        sa.Column("status", quote_status, nullable=False, server_default="New"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    op.create_index("ix_rental_quotes_reference", "rental_quotes", ["reference"], unique=True)
    op.create_index("ix_rental_quotes_status", "rental_quotes", ["status"])

    op.create_table(
        "rental_quote_items",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column(
            "quote_id",
            sa.Integer(),
            sa.ForeignKey("rental_quotes.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("equipment_name", sa.String(255), nullable=False),
        sa.Column("category", sa.String(100), nullable=False, server_default=""),
        sa.Column("quantity", sa.Integer(), nullable=False, server_default="1"),
        sa.Column("daily_rate", sa.Numeric(12, 2), nullable=False, server_default="0"),
    )
    op.create_index("ix_rental_quote_items_quote_id", "rental_quote_items", ["quote_id"])


def downgrade() -> None:
    op.drop_table("rental_quote_items")
    op.drop_index("ix_rental_quotes_status", table_name="rental_quotes")
    op.drop_index("ix_rental_quotes_reference", table_name="rental_quotes")
    op.drop_table("rental_quotes")
    sa.Enum(name="quotestatus").drop(op.get_bind(), checkfirst=True)
    sa.Enum(name="fulfilmentmethod").drop(op.get_bind(), checkfirst=True)
    op.drop_column("equipment", "is_public")
    op.drop_column("equipment", "image_url")
    op.drop_column("equipment", "description")
    op.drop_column("equipment", "daily_rate")
