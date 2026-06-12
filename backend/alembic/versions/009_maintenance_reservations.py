"""asset lifecycle (Retired), supplier/warranty, maintenance logs, reservations

Revision ID: 009
Revises: 008
Create Date: 2026-06-12 12:00:00.000000
"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = "009"
down_revision: Union[str, None] = "008"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Lifecycle: assets can now be retired (excluded from operations, kept for records)
    op.execute("ALTER TYPE equipmentstatus ADD VALUE IF NOT EXISTS 'Retired'")

    # Procurement details on the asset register
    op.add_column("equipment", sa.Column("supplier", sa.String(length=255), nullable=True))
    op.add_column("equipment", sa.Column("warranty_expiry", sa.Date(), nullable=True))

    # Maintenance work logs (CMMS-style)
    op.create_table(
        "maintenance_logs",
        sa.Column("id", sa.Integer(), primary_key=True, index=True),
        sa.Column("equipment_id", sa.Integer(),
                  sa.ForeignKey("equipment.id", ondelete="CASCADE"), nullable=False, index=True),
        sa.Column("title", sa.String(length=255), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("status", sa.String(length=20), nullable=False, server_default="Open"),
        sa.Column("cost", sa.Numeric(12, 2), nullable=True),
        sa.Column("reported_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("completed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("resolution_notes", sa.Text(), nullable=True),
    )

    # Reservations (forward bookings of specific units)
    op.create_table(
        "reservations",
        sa.Column("id", sa.Integer(), primary_key=True, index=True),
        sa.Column("equipment_id", sa.Integer(),
                  sa.ForeignKey("equipment.id", ondelete="CASCADE"), nullable=False, index=True),
        sa.Column("client_id", sa.Integer(),
                  sa.ForeignKey("clients.id", ondelete="CASCADE"), nullable=False, index=True),
        sa.Column("start_date", sa.Date(), nullable=False),
        sa.Column("end_date", sa.Date(), nullable=False),
        sa.Column("status", sa.String(length=20), nullable=False, server_default="Upcoming"),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )


def downgrade() -> None:
    op.drop_table("reservations")
    op.drop_table("maintenance_logs")
    op.drop_column("equipment", "warranty_expiry")
    op.drop_column("equipment", "supplier")
    # Note: PostgreSQL cannot drop a value from an enum type; 'Retired' stays.
