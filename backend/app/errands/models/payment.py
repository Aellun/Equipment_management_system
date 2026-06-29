import enum
from datetime import datetime, timezone

from sqlalchemy import DateTime, Enum, Float, ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.errands.core.db import Base


class EscrowStatus(str, enum.Enum):
    pending = "pending"     # STK push sent, awaiting callback
    held = "held"           # funds confirmed, held in escrow
    released = "released"   # released to runner/platform on completion
    refunded = "refunded"   # refunded to customer (cancel/dispute)
    failed = "failed"       # payment failed


def _now() -> datetime:
    return datetime.now(timezone.utc)


class Payment(Base):
    __tablename__ = "errand_payments"

    id: Mapped[int] = mapped_column(primary_key=True)
    task_id: Mapped[int] = mapped_column(ForeignKey("errand_tasks.id"), unique=True)

    amount: Mapped[float] = mapped_column(Float)
    phone: Mapped[str] = mapped_column(String(20))
    checkout_request_id: Mapped[str | None] = mapped_column(String(80), nullable=True, index=True)
    merchant_request_id: Mapped[str | None] = mapped_column(String(80), nullable=True)
    mpesa_receipt: Mapped[str | None] = mapped_column(String(40), nullable=True)

    escrow_status: Mapped[EscrowStatus] = mapped_column(
        Enum(EscrowStatus, name="errand_escrow_status"), default=EscrowStatus.pending
    )
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=_now, onupdate=_now
    )

    task = relationship("Task", back_populates="payment")
