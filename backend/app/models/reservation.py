from datetime import datetime, date

from sqlalchemy import String, Text, Date, DateTime, ForeignKey, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base

RESERVATION_STATUSES = ("Upcoming", "Fulfilled", "Cancelled")


class Reservation(Base):
    __tablename__ = "reservations"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    equipment_id: Mapped[int] = mapped_column(
        ForeignKey("equipment.id", ondelete="CASCADE"), nullable=False, index=True
    )
    client_id: Mapped[int] = mapped_column(
        ForeignKey("clients.id", ondelete="CASCADE"), nullable=False, index=True
    )
    start_date: Mapped[date] = mapped_column(Date, nullable=False)
    end_date: Mapped[date] = mapped_column(Date, nullable=False)
    status: Mapped[str] = mapped_column(String(20), default="Upcoming", nullable=False)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    equipment: Mapped["Equipment"] = relationship("Equipment", back_populates="reservations")
    client: Mapped["Client"] = relationship("Client")
