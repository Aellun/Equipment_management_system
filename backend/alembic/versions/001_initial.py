"""initial

Revision ID: 001
Revises:
Create Date: 2026-05-14 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import ENUM as PgEnum

revision: str = "001"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Create PostgreSQL enum types via raw SQL so the DO block catches
    # any "already exists" error idempotently.
    op.execute(sa.text("""
        DO $$ BEGIN
            CREATE TYPE equipmentstatus AS ENUM ('Available', 'Out', 'Maintenance');
        EXCEPTION WHEN duplicate_object THEN null;
        END $$;
    """))
    op.execute(sa.text("""
        DO $$ BEGIN
            CREATE TYPE conditiononreturn AS ENUM ('Good', 'Damaged', 'Needs Repair');
        EXCEPTION WHEN duplicate_object THEN null;
        END $$;
    """))

    # create_type=False tells SQLAlchemy the PG type already exists — don't emit CREATE TYPE again.
    equipment_status_col = PgEnum("Available", "Out", "Maintenance", name="equipmentstatus", create_type=False)
    condition_col = PgEnum("Good", "Damaged", "Needs Repair", name="conditiononreturn", create_type=False)

    op.create_table(
        "equipment",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("name", sa.String(length=255), nullable=False),
        sa.Column("serial_number", sa.String(length=100), nullable=False),
        sa.Column("category", sa.String(length=100), nullable=False),
        sa.Column("status", equipment_status_col, nullable=False, server_default="Available"),
        sa.Column("last_inspected", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()")),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("serial_number"),
    )
    op.create_index(op.f("ix_equipment_id"), "equipment", ["id"], unique=False)

    op.create_table(
        "clients",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("name", sa.String(length=255), nullable=False),
        sa.Column("email", sa.String(length=255), nullable=False),
        sa.Column("phone", sa.String(length=20), nullable=True),
        sa.Column("id_proof_ref", sa.String(length=255), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()")),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("email"),
    )
    op.create_index(op.f("ix_clients_id"), "clients", ["id"], unique=False)

    op.create_table(
        "transactions",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("equipment_id", sa.Integer(), nullable=False),
        sa.Column("client_id", sa.Integer(), nullable=False),
        sa.Column("out_timestamp", sa.DateTime(timezone=True), server_default=sa.text("now()")),
        sa.Column("due_date", sa.DateTime(timezone=True), nullable=False),
        sa.Column("staff_out_id", sa.String(length=255), nullable=False),
        sa.ForeignKeyConstraint(["equipment_id"], ["equipment.id"]),
        sa.ForeignKeyConstraint(["client_id"], ["clients.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_transactions_id"), "transactions", ["id"], unique=False)

    op.create_table(
        "audit_logs",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("transaction_id", sa.Integer(), nullable=False),
        sa.Column("return_timestamp", sa.DateTime(timezone=True), server_default=sa.text("now()")),
        sa.Column("condition_on_return", condition_col, nullable=False),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.ForeignKeyConstraint(["transaction_id"], ["transactions.id"]),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("transaction_id"),
    )
    op.create_index(op.f("ix_audit_logs_id"), "audit_logs", ["id"], unique=False)


def downgrade() -> None:
    op.drop_index(op.f("ix_audit_logs_id"), table_name="audit_logs")
    op.drop_table("audit_logs")
    op.drop_index(op.f("ix_transactions_id"), table_name="transactions")
    op.drop_table("transactions")
    op.drop_index(op.f("ix_clients_id"), table_name="clients")
    op.drop_table("clients")
    op.drop_index(op.f("ix_equipment_id"), table_name="equipment")
    op.drop_table("equipment")
    op.execute(sa.text("DROP TYPE IF EXISTS conditiononreturn"))
    op.execute(sa.text("DROP TYPE IF EXISTS equipmentstatus"))
