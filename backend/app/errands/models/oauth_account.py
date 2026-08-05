from datetime import datetime, timezone

from sqlalchemy import DateTime, ForeignKey, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.errands.core.db import Base


def _now() -> datetime:
    return datetime.now(timezone.utc)


class OAuthAccount(Base):
    """A social identity linked to a services account.

    One row per provider per user, so the same person can sign in with Google
    today and Facebook tomorrow and land on the same account (matched by
    verified email the first time, by `provider_account_id` after that).
    """

    __tablename__ = "errand_oauth_accounts"
    __table_args__ = (
        UniqueConstraint("provider", "provider_account_id", name="uq_errand_oauth_identity"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("errand_users.id"), index=True)
    provider: Mapped[str] = mapped_column(String(40), index=True)
    provider_account_id: Mapped[str] = mapped_column(String(191))
    email: Mapped[str] = mapped_column(String(160), default="")
    avatar_url: Mapped[str] = mapped_column(String(500), default="")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now)

    user: Mapped["User"] = relationship(back_populates="oauth_accounts")  # noqa: F821
