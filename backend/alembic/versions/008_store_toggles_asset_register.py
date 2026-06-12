"""shop category visibility toggle + equipment asset-register fields

Revision ID: 008
Revises: 007
Create Date: 2026-06-12 10:00:00.000000
"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = "008"
down_revision: Union[str, None] = "007"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Storefront visibility toggle for shop categories (departments already have one)
    op.add_column(
        "shop_categories",
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.true()),
    )

    # Asset-register fields for equipment (location, purchase info, notes)
    op.add_column("equipment", sa.Column("location", sa.String(length=255), nullable=True))
    op.add_column("equipment", sa.Column("purchase_date", sa.Date(), nullable=True))
    op.add_column("equipment", sa.Column("purchase_cost", sa.Numeric(12, 2), nullable=True))
    op.add_column("equipment", sa.Column("notes", sa.Text(), nullable=True))


def downgrade() -> None:
    op.drop_column("equipment", "notes")
    op.drop_column("equipment", "purchase_cost")
    op.drop_column("equipment", "purchase_date")
    op.drop_column("equipment", "location")
    op.drop_column("shop_categories", "is_active")
