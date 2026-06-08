"""link product variants to a specific image (variant.image_id)

Revision ID: 007
Revises: 006
Create Date: 2026-06-07 13:00:00.000000
"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = "007"
down_revision: Union[str, None] = "006"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("product_variants", sa.Column("image_id", sa.Integer(), nullable=True))
    op.create_foreign_key(
        "fk_variant_image", "product_variants", "product_images",
        ["image_id"], ["id"], ondelete="SET NULL",
    )


def downgrade() -> None:
    op.drop_constraint("fk_variant_image", "product_variants", type_="foreignkey")
    op.drop_column("product_variants", "image_id")
