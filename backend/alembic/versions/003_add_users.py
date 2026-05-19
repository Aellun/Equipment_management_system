"""add users table

Revision ID: 003
Revises: 002
Create Date: 2026-05-16 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import ENUM as PgEnum

revision: str = "003"
down_revision: Union[str, None] = "002"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute(sa.text("""
        DO $$ BEGIN
            CREATE TYPE userrole AS ENUM ('Administrator', 'Staff');
        EXCEPTION WHEN duplicate_object THEN null;
        END $$;
    """))
    
    user_role_col = PgEnum("Administrator", "Staff", name="userrole", create_type=False)
    
    op.create_table(
        "users",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("name", sa.String(length=255), nullable=False),
        sa.Column("email", sa.String(length=255), nullable=False),
        sa.Column("password_hash", sa.String(length=255), nullable=False),
        sa.Column("role", user_role_col, nullable=False, server_default="Staff"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()")),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("email"),
    )
    op.create_index(op.f("ix_users_id"), "users", ["id"], unique=False)
    
    # Insert default admin user with hashed password "Admin2024"
    op.execute(sa.text("""
        INSERT INTO users (name, email, password_hash, role) 
        VALUES ('Admin', 'admin@fabent.com', '$2b$12$HZ4RLFPyy.aJajMo01ahXeErpwR.AA0QqLy1jmX8STeP5bJ8EyXXm', 'Administrator')
        ON CONFLICT (email) DO NOTHING
    """))


def downgrade() -> None:
    op.drop_index(op.f("ix_users_id"), table_name="users")
    op.drop_table("users")
    op.execute(sa.text("DROP TYPE IF EXISTS userrole"))