from datetime import datetime, timezone

from sqlalchemy import DateTime, ForeignKey, Integer, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.errands.core.db import Base


def _now() -> datetime:
    return datetime.now(timezone.utc)


class Review(Base):
    __tablename__ = "errand_reviews"

    id: Mapped[int] = mapped_column(primary_key=True)
    task_id: Mapped[int] = mapped_column(ForeignKey("errand_tasks.id"), unique=True)
    runner_id: Mapped[int] = mapped_column(ForeignKey("errand_users.id"), index=True)
    customer_id: Mapped[int] = mapped_column(ForeignKey("errand_users.id"))

    rating: Mapped[int] = mapped_column(Integer)  # 1..5
    comment: Mapped[str] = mapped_column(String(500), default="")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now)

    task = relationship("Task", back_populates="review")
