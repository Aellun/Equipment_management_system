from datetime import datetime

from sqlalchemy import String, Text, Numeric, DateTime, ForeignKey, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base

# Work-log lifecycle: Open -> In Progress -> Completed (or Cancelled)
MAINTENANCE_STATUSES = ("Open", "In Progress", "Completed", "Cancelled")


class MaintenanceLog(Base):
    __tablename__ = "maintenance_logs"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    equipment_id: Mapped[int] = mapped_column(
        ForeignKey("equipment.id", ondelete="CASCADE"), nullable=False, index=True
    )
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    status: Mapped[str] = mapped_column(String(20), default="Open", nullable=False)
    cost: Mapped[float | None] = mapped_column(Numeric(12, 2), nullable=True)
    reported_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    completed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    resolution_notes: Mapped[str | None] = mapped_column(Text, nullable=True)

    equipment: Mapped["Equipment"] = relationship("Equipment", back_populates="maintenance_logs")
