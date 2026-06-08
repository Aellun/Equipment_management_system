from datetime import datetime

from sqlalchemy import String, Text, Boolean, Integer, DateTime, JSON, func
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class Department(Base):
    """A top-level product line (e.g. 'Kitchenware', 'Clothing').

    Drives dynamic catalog behaviour: each department defines the attribute
    labels its variants use, so adding 'Clothing' later surfaces Size/Colour
    fields without any code change.
    """

    __tablename__ = "departments"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    name: Mapped[str] = mapped_column(String(100), unique=True, nullable=False)
    slug: Mapped[str] = mapped_column(String(120), unique=True, nullable=False, index=True)
    tagline: Mapped[str | None] = mapped_column(String(255), nullable=True)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    # e.g. ["Size", "Colour", "Material"] — used as variant attribute keys & form labels
    attribute_labels: Mapped[list | None] = mapped_column(JSON, nullable=True)
    icon: Mapped[str | None] = mapped_column(String(80), nullable=True)  # emoji/glyph for nav
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    sort_order: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class StoreSetting(Base):
    """Single-row key/value store for site-wide config (name, hero copy, policies)."""

    __tablename__ = "store_settings"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    key: Mapped[str] = mapped_column(String(80), unique=True, nullable=False, index=True)
    value: Mapped[str | None] = mapped_column(Text, nullable=True)
