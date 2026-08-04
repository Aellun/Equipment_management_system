import enum
from datetime import datetime, timezone

from sqlalchemy import DateTime, Enum, Float, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.errands.core.db import Base


class TaskStatus(str, enum.Enum):
    quoted = "quoted"            # quote generated, awaiting payment
    paid = "paid"               # M-Pesa payment received, awaiting assignment
    assigned = "assigned"       # runner assigned
    in_progress = "in_progress"
    proof_submitted = "proof_submitted"
    completed = "completed"     # customer accepted the proof
    disputed = "disputed"
    cancelled = "cancelled"


class Urgency(str, enum.Enum):
    standard = "standard"   # within the day
    express = "express"     # within ~2 hours
    sameday = "sameday"     # scheduled same day window


def _now() -> datetime:
    return datetime.now(timezone.utc)


class Task(Base):
    __tablename__ = "errand_tasks"

    id: Mapped[int] = mapped_column(primary_key=True)
    reference: Mapped[str] = mapped_column(String(20), unique=True, index=True)

    customer_id: Mapped[int] = mapped_column(ForeignKey("errand_users.id"))
    runner_id: Mapped[int | None] = mapped_column(ForeignKey("errand_users.id"), nullable=True)
    service_type_id: Mapped[int] = mapped_column(ForeignKey("errand_service_types.id"))

    pickup_location: Mapped[str] = mapped_column(String(200), default="")
    dropoff_location: Mapped[str] = mapped_column(String(200), default="")
    # Phone the runner should call/reach for this errand (from booking).
    contact_phone: Mapped[str] = mapped_column(String(20), default="")
    distance_km: Mapped[float] = mapped_column(Float, default=0.0)
    urgency: Mapped[Urgency] = mapped_column(Enum(Urgency, name="errand_urgency"), default=Urgency.standard)
    notes: Mapped[str] = mapped_column(Text, default="")

    # Transparent price breakdown (KSh)
    base_price: Mapped[float] = mapped_column(Float, default=0.0)
    distance_fee: Mapped[float] = mapped_column(Float, default=0.0)
    urgency_fee: Mapped[float] = mapped_column(Float, default=0.0)
    service_fee: Mapped[float] = mapped_column(Float, default=0.0)
    total_price: Mapped[float] = mapped_column(Float, default=0.0)

    status: Mapped[TaskStatus] = mapped_column(
        Enum(TaskStatus, name="errand_task_status"), default=TaskStatus.quoted, index=True
    )
    proof_photo_url: Mapped[str | None] = mapped_column(String(300), nullable=True)
    proof_note: Mapped[str] = mapped_column(String(400), default="")

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=_now, onupdate=_now
    )

    service_type = relationship("ServiceType")
    payment = relationship("Payment", back_populates="task", uselist=False)
    review = relationship("Review", back_populates="task", uselist=False)
