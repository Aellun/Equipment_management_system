import enum
from datetime import datetime

from sqlalchemy import ForeignKey, DateTime, Enum as SQLEnum, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class ConditionOnReturn(str, enum.Enum):
    good = "Good"
    damaged = "Damaged"
    needs_repair = "Needs Repair"


class AuditLog(Base):
    __tablename__ = "audit_logs"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    transaction_id: Mapped[int] = mapped_column(ForeignKey("transactions.id"), unique=True, nullable=False)
    return_timestamp: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    condition_on_return: Mapped[ConditionOnReturn] = mapped_column(
        SQLEnum(ConditionOnReturn, values_callable=lambda x: [e.value for e in x]),
        nullable=False,
    )
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)

    transaction: Mapped["Transaction"] = relationship("Transaction", back_populates="audit_log")
