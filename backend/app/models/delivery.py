from datetime import datetime

from sqlalchemy import String, Numeric, Integer, Boolean, DateTime, func
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class DeliveryZone(Base):
    """A delivery region with door + pickup fees (Jumia/Kilimall-style zones)."""

    __tablename__ = "delivery_zones"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    name: Mapped[str] = mapped_column(String(120), nullable=False)
    description: Mapped[str | None] = mapped_column(String(255), nullable=True)
    door_fee: Mapped[float] = mapped_column(Numeric(10, 2), default=0, nullable=False)
    pickup_fee: Mapped[float] = mapped_column(Numeric(10, 2), default=0, nullable=False)
    eta_days_min: Mapped[int] = mapped_column(Integer, default=1, nullable=False)
    eta_days_max: Mapped[int] = mapped_column(Integer, default=3, nullable=False)
    free_over: Mapped[float | None] = mapped_column(Numeric(12, 2), nullable=True)  # free door delivery over this subtotal
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    sort_order: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
