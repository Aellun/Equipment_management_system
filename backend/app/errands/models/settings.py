from sqlalchemy import Boolean
from sqlalchemy.orm import Mapped, mapped_column

from app.errands.core.db import Base


class AppSetting(Base):
    """Singleton (id=1) holding platform-wide operational settings."""

    __tablename__ = "errand_settings"

    id: Mapped[int] = mapped_column(primary_key=True)
    # When True, paid tasks auto-assign to an available runner and the open
    # pool is visible to runners. When False, an admin assigns each task and
    # runners only see tasks assigned to them.
    auto_assign: Mapped[bool] = mapped_column(Boolean, default=True)
