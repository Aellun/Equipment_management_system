"""add marketplace features: departments, reviews, delivery zones, tracking, returns, store settings
plus product (usage_guide, brand, department_id, is_genuine_guaranteed) and order delivery columns

Revision ID: 006
Revises: 005
Create Date: 2026-06-07 12:00:00.000000
"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = "006"
down_revision: Union[str, None] = "005"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


review_type = sa.Enum("Product", "Store", name="reviewtype")
return_status = sa.Enum("Requested", "Approved", "Rejected", "Refunded", name="returnstatus")


def upgrade() -> None:
    # ---- departments ----
    op.create_table(
        "departments",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("name", sa.String(100), nullable=False),
        sa.Column("slug", sa.String(120), nullable=False),
        sa.Column("tagline", sa.String(255), nullable=True),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("attribute_labels", sa.JSON(), nullable=True),
        sa.Column("icon", sa.String(80), nullable=True),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column("sort_order", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("name"),
        sa.UniqueConstraint("slug"),
    )
    op.create_index("ix_departments_id", "departments", ["id"])
    op.create_index("ix_departments_slug", "departments", ["slug"])

    # ---- store_settings ----
    op.create_table(
        "store_settings",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("key", sa.String(80), nullable=False),
        sa.Column("value", sa.Text(), nullable=True),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("key"),
    )
    op.create_index("ix_store_settings_id", "store_settings", ["id"])
    op.create_index("ix_store_settings_key", "store_settings", ["key"])

    # ---- delivery_zones ----
    op.create_table(
        "delivery_zones",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("name", sa.String(120), nullable=False),
        sa.Column("description", sa.String(255), nullable=True),
        sa.Column("door_fee", sa.Numeric(10, 2), nullable=False, server_default="0"),
        sa.Column("pickup_fee", sa.Numeric(10, 2), nullable=False, server_default="0"),
        sa.Column("eta_days_min", sa.Integer(), nullable=False, server_default="1"),
        sa.Column("eta_days_max", sa.Integer(), nullable=False, server_default="3"),
        sa.Column("free_over", sa.Numeric(12, 2), nullable=True),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column("sort_order", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_delivery_zones_id", "delivery_zones", ["id"])

    # ---- reviews ----
    op.create_table(
        "reviews",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("review_type", review_type, nullable=False, server_default="Product"),
        sa.Column("product_id", sa.Integer(), nullable=True),
        sa.Column("rating", sa.Integer(), nullable=False),
        sa.Column("title", sa.String(255), nullable=True),
        sa.Column("body", sa.Text(), nullable=True),
        sa.Column("reviewer_name", sa.String(255), nullable=False),
        sa.Column("reviewer_email", sa.String(255), nullable=True),
        sa.Column("verified_purchase", sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column("is_published", sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["product_id"], ["products.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_reviews_id", "reviews", ["id"])

    # ---- tracking_events ----
    op.create_table(
        "tracking_events",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("order_id", sa.Integer(), nullable=False),
        sa.Column("status", sa.String(50), nullable=False),
        sa.Column("note", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["order_id"], ["orders.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_tracking_events_id", "tracking_events", ["id"])

    # ---- return_requests ----
    op.create_table(
        "return_requests",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("order_id", sa.Integer(), nullable=False),
        sa.Column("reason", sa.String(120), nullable=False),
        sa.Column("details", sa.Text(), nullable=True),
        sa.Column("contact_email", sa.String(255), nullable=False),
        sa.Column("status", return_status, nullable=False, server_default="Requested"),
        sa.Column("admin_note", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["order_id"], ["orders.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_return_requests_id", "return_requests", ["id"])

    # ---- product columns ----
    op.add_column("products", sa.Column("usage_guide", sa.Text(), nullable=True))
    op.add_column("products", sa.Column("brand", sa.String(120), nullable=True))
    op.add_column("products", sa.Column("department_id", sa.Integer(), nullable=True))
    op.add_column("products", sa.Column("is_genuine_guaranteed", sa.Boolean(), nullable=False, server_default=sa.true()))
    op.create_foreign_key(
        "fk_products_department", "products", "departments", ["department_id"], ["id"], ondelete="SET NULL"
    )

    # ---- order columns ----
    op.add_column("orders", sa.Column("delivery_zone_name", sa.String(120), nullable=True))
    op.add_column("orders", sa.Column("delivery_method", sa.String(20), nullable=False, server_default="door"))
    op.add_column("orders", sa.Column("delivery_fee", sa.Numeric(10, 2), nullable=False, server_default="0"))


def downgrade() -> None:
    op.drop_column("orders", "delivery_fee")
    op.drop_column("orders", "delivery_method")
    op.drop_column("orders", "delivery_zone_name")

    op.drop_constraint("fk_products_department", "products", type_="foreignkey")
    op.drop_column("products", "is_genuine_guaranteed")
    op.drop_column("products", "department_id")
    op.drop_column("products", "brand")
    op.drop_column("products", "usage_guide")

    op.drop_table("return_requests")
    op.drop_table("tracking_events")
    op.drop_table("reviews")
    op.drop_table("delivery_zones")
    op.drop_table("store_settings")
    op.drop_table("departments")
    return_status.drop(op.get_bind(), checkfirst=True)
    review_type.drop(op.get_bind(), checkfirst=True)
