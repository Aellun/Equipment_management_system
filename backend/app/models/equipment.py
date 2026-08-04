import enum
from datetime import datetime, date

from sqlalchemy import String, Text, Numeric, Date, Boolean, Enum as SQLEnum, DateTime, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class EquipmentStatus(str, enum.Enum):
    available = "Available"
    out = "Out"
    maintenance = "Maintenance"
    retired = "Retired"


class Equipment(Base):
    __tablename__ = "equipment"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    serial_number: Mapped[str] = mapped_column(String(100), unique=True, nullable=False)
    category: Mapped[str] = mapped_column(String(100), nullable=False)
    status: Mapped[EquipmentStatus] = mapped_column(
        SQLEnum(EquipmentStatus, values_callable=lambda x: [e.value for e in x]),
        default=EquipmentStatus.available,
        nullable=False,
    )
    last_inspected: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    # Asset register fields
    location: Mapped[str | None] = mapped_column(String(255), nullable=True)
    purchase_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    purchase_cost: Mapped[float | None] = mapped_column(Numeric(12, 2), nullable=True)
    supplier: Mapped[str | None] = mapped_column(String(255), nullable=True)
    warranty_expiry: Mapped[date | None] = mapped_column(Date, nullable=True)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    # ── Storefront (Dyzah Events) ────────────────────────────────
    # Stock is serialised one row per unit, but customers hire by the item
    # ("12 round tables"), so the storefront groups by name and these fields
    # describe the group. Set them on any unit and the group inherits them.
    daily_rate: Mapped[float | None] = mapped_column(Numeric(12, 2), nullable=True)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    image_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    # Off by default: nothing appears on the public site until someone says so.
    is_public: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    transactions: Mapped[list["Transaction"]] = relationship("Transaction", back_populates="equipment")
    maintenance_logs: Mapped[list["MaintenanceLog"]] = relationship(
        "MaintenanceLog", back_populates="equipment", cascade="all, delete-orphan"
    )
    reservations: Mapped[list["Reservation"]] = relationship(
        "Reservation", back_populates="equipment", cascade="all, delete-orphan"
    )
