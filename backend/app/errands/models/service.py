from sqlalchemy import Boolean, Float, Integer, String
from sqlalchemy.orm import Mapped, mapped_column

from app.errands.core.db import Base


class ServiceType(Base):
    """Catalog-driven service definition.

    New verticals (students, jobs, diaspora, corporate) are just new rows —
    no schema change. `is_active=False` renders a 'coming soon' card.
    """

    __tablename__ = "errand_service_types"

    id: Mapped[int] = mapped_column(primary_key=True)
    slug: Mapped[str] = mapped_column(String(80), unique=True, index=True)
    name: Mapped[str] = mapped_column(String(120))
    # Business line this service belongs to: "errands" | "hygiene" (and future verticals).
    # The booking/pricing/assignment/payment engine is shared; a new business is
    # just a new vertical + catalog rows, no schema change.
    vertical: Mapped[str] = mapped_column(String(40), default="errands", index=True)
    category: Mapped[str] = mapped_column(String(80), index=True)
    description: Mapped[str] = mapped_column(String(400), default="")
    icon: Mapped[str] = mapped_column(String(40), default="📦")

    base_price: Mapped[float] = mapped_column(Float, default=0.0)  # KSh
    price_unit: Mapped[str] = mapped_column(String(40), default="per task")
    est_minutes: Mapped[int] = mapped_column(Integer, default=60)
    # Some services (shopping) charge a service fee but goods are paid separately.
    goods_paid_separately: Mapped[bool] = mapped_column(Boolean, default=False)

    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    sort_order: Mapped[int] = mapped_column(Integer, default=100)
