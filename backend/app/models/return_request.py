import enum
from datetime import datetime

from sqlalchemy import String, Text, DateTime, ForeignKey, Enum as SQLEnum, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class ReturnStatus(str, enum.Enum):
    requested = "Requested"
    approved = "Approved"
    rejected = "Rejected"
    refunded = "Refunded"


class ReturnRequest(Base):
    """Customer-initiated return/refund request tied to an order — part of the
    'Genuine Guarantee' trust system that addresses Kenya's poor-refund pain point."""

    __tablename__ = "return_requests"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    order_id: Mapped[int] = mapped_column(ForeignKey("orders.id", ondelete="CASCADE"), nullable=False)
    reason: Mapped[str] = mapped_column(String(120), nullable=False)
    details: Mapped[str | None] = mapped_column(Text, nullable=True)
    contact_email: Mapped[str] = mapped_column(String(255), nullable=False)
    status: Mapped[ReturnStatus] = mapped_column(
        SQLEnum(ReturnStatus, values_callable=lambda x: [e.value for e in x]),
        default=ReturnStatus.requested, nullable=False,
    )
    admin_note: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    order: Mapped["Order"] = relationship("Order")
