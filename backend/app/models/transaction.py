from datetime import datetime

from sqlalchemy import String, ForeignKey, DateTime, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class Transaction(Base):
    __tablename__ = "transactions"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    equipment_id: Mapped[int] = mapped_column(ForeignKey("equipment.id"), nullable=False)
    client_id: Mapped[int] = mapped_column(ForeignKey("clients.id"), nullable=False)
    out_timestamp: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    due_date: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    staff_out_id: Mapped[str] = mapped_column(String(255), nullable=False)

    equipment: Mapped["Equipment"] = relationship("Equipment", back_populates="transactions")
    client: Mapped["Client"] = relationship("Client", back_populates="transactions")
    audit_log: Mapped["AuditLog | None"] = relationship(
        "AuditLog", back_populates="transaction", uselist=False
    )
