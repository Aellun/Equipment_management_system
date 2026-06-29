import enum
from datetime import datetime, timezone

from sqlalchemy import Boolean, DateTime, Enum, Float, ForeignKey, Integer, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.errands.core.db import Base


class UserRole(str, enum.Enum):
    customer = "customer"
    runner = "runner"
    admin = "admin"


class VerificationStatus(str, enum.Enum):
    pending = "pending"
    verified = "verified"
    rejected = "rejected"


def _now() -> datetime:
    return datetime.now(timezone.utc)


class User(Base):
    __tablename__ = "errand_users"

    id: Mapped[int] = mapped_column(primary_key=True)
    full_name: Mapped[str] = mapped_column(String(120))
    email: Mapped[str] = mapped_column(String(160), unique=True, index=True)
    phone: Mapped[str] = mapped_column(String(20), index=True)
    hashed_password: Mapped[str] = mapped_column(String(255))
    role: Mapped[UserRole] = mapped_column(Enum(UserRole, name="errand_user_role"), default=UserRole.customer)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now)

    runner_profile: Mapped["RunnerProfile | None"] = relationship(
        back_populates="user", uselist=False
    )


class RunnerProfile(Base):
    __tablename__ = "errand_runner_profiles"

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("errand_users.id"), unique=True)
    suburb: Mapped[str] = mapped_column(String(80), default="Nairobi CBD")
    bio: Mapped[str] = mapped_column(String(400), default="")
    skills: Mapped[str] = mapped_column(String(300), default="")  # comma-separated
    id_number: Mapped[str] = mapped_column(String(40), default="")
    verification_status: Mapped[VerificationStatus] = mapped_column(
        Enum(VerificationStatus, name="errand_verification_status"), default=VerificationStatus.pending
    )
    is_available: Mapped[bool] = mapped_column(Boolean, default=True)
    rating_avg: Mapped[float] = mapped_column(Float, default=0.0)
    rating_count: Mapped[int] = mapped_column(Integer, default=0)
    completed_tasks: Mapped[int] = mapped_column(Integer, default=0)

    user: Mapped[User] = relationship(back_populates="runner_profile")
