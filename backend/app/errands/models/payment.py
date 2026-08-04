import enum
from datetime import datetime, timezone

from sqlalchemy import DateTime, Enum, Float, ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.errands.core.db import Base


class PaymentStatus(str, enum.Enum):
    pending = "pending"     # STK push sent, awaiting callback
    paid = "paid"           # payment received directly by the admin M-Pesa account
    failed = "failed"       # payment failed
    refunded = "refunded"   # admin manually refunded the customer (recorded for bookkeeping)


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

    payment_status: Mapped[PaymentStatus] = mapped_column(
        Enum(PaymentStatus, name="errand_payment_status"), default=PaymentStatus.pending
    )
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=_now, onupdate=_now
    )

    task = relationship("Task", back_populates="payment")
