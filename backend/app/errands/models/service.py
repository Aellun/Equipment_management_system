import enum

from sqlalchemy import Boolean, Enum, Float, Integer, String
from sqlalchemy.orm import Mapped, mapped_column

from app.errands.core.db import Base


class QuoteMode(str, enum.Enum):
    """How a service is priced and booked — this picks the customer's path.

    Cleaning does not price like an errand. A three-bedroom house can be
    quoted instantly from its room count; a hospital or factory cannot be
    quoted without someone walking the site first. Both patterns are standard
    in the industry, and mixing them up either scares off homeowners with a
    contact form or under-quotes a commercial contract.
    """

    # Priced from the size of the property. Book and pay online.
    rooms = "rooms"
    # Priced per unit or visit (bins serviced, kg of laundry, dispensers).
    # Book and pay online.
    unit = "unit"
    # No public price. The customer requests a free site survey and we quote
    # after visiting — commercial, institutional, healthcare, industrial.
    survey = "survey"
    # Errands and anything else priced by route distance.
    distance = "distance"


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
    # Which booking path this service sends the customer down.
    quote_mode: Mapped[QuoteMode] = mapped_column(
        Enum(QuoteMode, name="errand_quote_mode"), default=QuoteMode.distance, index=True
    )
    # For `rooms` pricing: how many bed/bathrooms the base price already covers.
    included_bedrooms: Mapped[int] = mapped_column(Integer, default=2)
    included_bathrooms: Mapped[int] = mapped_column(Integer, default=1)
    # Some services (shopping) charge a service fee but goods are paid separately.
    goods_paid_separately: Mapped[bool] = mapped_column(Boolean, default=False)

    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    sort_order: Mapped[int] = mapped_column(Integer, default=100)
