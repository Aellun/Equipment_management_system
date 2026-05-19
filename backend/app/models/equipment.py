import enum
from datetime import datetime

from sqlalchemy import String, Enum as SQLEnum, DateTime, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class EquipmentStatus(str, enum.Enum):
    available = "Available"
    out = "Out"
    maintenance = "Maintenance"


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
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    transactions: Mapped[list["Transaction"]] = relationship("Transaction", back_populates="equipment")
