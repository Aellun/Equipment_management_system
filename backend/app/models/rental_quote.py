"""Dyzah Events — customer quote requests from the public storefront.

Event rental is quote-led, not checkout-led: a customer picks dates and a list
of items, and the hire company confirms availability, delivery and a price
before anything is paid. That is how the established platforms in this space
work (soft availability + quote request), and it is what lets us hold a
three-day wedding hire without taking money for stock that may need
substituting.

PRIVACY: a request carries the customer's name, phone, email and the venue
address. None of it is returned from a public route — the storefront gets a
reference and a status back, and the full record is admin-only.
"""
import enum
from datetime import date, datetime

from sqlalchemy import (
    Date,
    DateTime,
    Enum as SQLEnum,
    ForeignKey,
    Integer,
    Numeric,
    String,
    Text,
    func,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class QuoteStatus(str, enum.Enum):
    new = "New"
    quoted = "Quoted"
    confirmed = "Confirmed"
    completed = "Completed"
    cancelled = "Cancelled"


class FulfilmentMethod(str, enum.Enum):
    delivery = "Delivery"
    collection = "Collection"


class RentalQuote(Base):
    __tablename__ = "rental_quotes"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    # Customer-facing handle, safe to quote over phone or email: EV-XXXXXX.
    reference: Mapped[str] = mapped_column(String(20), unique=True, index=True)

    # ── Contact (PII — admin routes only) ────────────────────────
    contact_name: Mapped[str] = mapped_column(String(120), nullable=False)
    contact_phone: Mapped[str] = mapped_column(String(30), default="")
    contact_email: Mapped[str] = mapped_column(String(160), default="")
    organisation: Mapped[str] = mapped_column(String(160), default="")

    # ── The event ────────────────────────────────────────────────
    event_type: Mapped[str] = mapped_column(String(80), default="")
    start_date: Mapped[date] = mapped_column(Date, nullable=False)
    end_date: Mapped[date] = mapped_column(Date, nullable=False)
    guest_count: Mapped[int] = mapped_column(Integer, default=0)
    fulfilment: Mapped[FulfilmentMethod] = mapped_column(
        SQLEnum(FulfilmentMethod, values_callable=lambda x: [e.value for e in x]),
        default=FulfilmentMethod.delivery,
    )
    # Venue address — treated as PII, same as the contact fields.
    venue: Mapped[str] = mapped_column(String(240), default="")
    notes: Mapped[str] = mapped_column(Text, default="")

    # ── Pricing (filled in by staff when quoting) ────────────────
    estimated_total: Mapped[float | None] = mapped_column(Numeric(12, 2), nullable=True)
    quoted_total: Mapped[float | None] = mapped_column(Numeric(12, 2), nullable=True)

    status: Mapped[QuoteStatus] = mapped_column(
        SQLEnum(QuoteStatus, values_callable=lambda x: [e.value for e in x]),
        default=QuoteStatus.new,
        index=True,
    )
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    items: Mapped[list["RentalQuoteItem"]] = relationship(
        "RentalQuoteItem", back_populates="quote", cascade="all, delete-orphan"
    )


class RentalQuoteItem(Base):
    """One line of a quote.

    Stock is grouped by name on the storefront (a customer wants "12 round
    tables", not twelve serial numbers), so a line records the group name and
    a quantity. Specific units are allocated at dispatch.
    """

    __tablename__ = "rental_quote_items"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    quote_id: Mapped[int] = mapped_column(
        ForeignKey("rental_quotes.id", ondelete="CASCADE"), nullable=False, index=True
    )
    equipment_name: Mapped[str] = mapped_column(String(255), nullable=False)
    category: Mapped[str] = mapped_column(String(100), default="")
    quantity: Mapped[int] = mapped_column(Integer, default=1)
    # Rate captured at request time so a later price change doesn't silently
    # rewrite what the customer was shown.
    daily_rate: Mapped[float] = mapped_column(Numeric(12, 2), default=0)

    quote: Mapped["RentalQuote"] = relationship("RentalQuote", back_populates="items")
