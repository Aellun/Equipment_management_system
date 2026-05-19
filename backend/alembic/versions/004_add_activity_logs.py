"""add activity_logs table

Revision ID: 004
Revises: 003
Create Date: 2026-05-17 00:00:00.000000
"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = "004"
down_revision: Union[str, None] = "003"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "activity_logs",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("timestamp", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("action", sa.String(50), nullable=False),
        sa.Column("entity_type", sa.String(50), nullable=False),
        sa.Column("entity_id", sa.Integer(), nullable=True),
        sa.Column("entity_name", sa.String(255), nullable=True),
        sa.Column("performed_by", sa.String(255), nullable=True),
        sa.Column("details", sa.Text(), nullable=True),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_activity_logs_id", "activity_logs", ["id"])
    op.create_index("ix_activity_logs_timestamp", "activity_logs", ["timestamp"])
    op.create_index("ix_activity_logs_entity_type", "activity_logs", ["entity_type"])


def downgrade() -> None:
    op.drop_index("ix_activity_logs_entity_type", table_name="activity_logs")
    op.drop_index("ix_activity_logs_timestamp", table_name="activity_logs")
    op.drop_index("ix_activity_logs_id", table_name="activity_logs")
    op.drop_table("activity_logs")
