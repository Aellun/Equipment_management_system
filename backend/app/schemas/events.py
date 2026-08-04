"""Schemas for the Dyzah Events storefront.

Two output shapes for a quote request, deliberately:
  * `QuoteReceipt` — what an unauthenticated caller gets: a reference, a
    status and a price. No contact details, no venue.
  * `QuoteOut`     — the full record including PII. Staff routes only.
"""
from datetime import date, datetime

from pydantic import BaseModel, EmailStr, Field

from app.models.rental_quote import FulfilmentMethod, QuoteStatus


class CatalogItem(BaseModel):
    """Stock grouped by item, as a customer thinks of it."""

    name: str
    category: str
    total_units: int
    available: int
    daily_rate: float
    description: str
    image_url: str


class AvailabilityRequest(BaseModel):
    names: list[str] = Field(min_length=1, max_length=60)
    start_date: date
    end_date: date


class AvailabilityResult(BaseModel):
    name: str
    available: int


class QuoteItemIn(BaseModel):
    equipment_name: str = Field(min_length=1, max_length=255)
    category: str = Field(default="", max_length=100)
    quantity: int = Field(ge=1, le=2000)
    daily_rate: float = Field(ge=0, default=0)


class QuoteCreate(BaseModel):
    contact_name: str = Field(min_length=2, max_length=120)
    contact_phone: str = Field(default="", max_length=30)
    contact_email: EmailStr | None = None
    organisation: str = Field(default="", max_length=160)
    event_type: str = Field(default="", max_length=80)
    start_date: date
    end_date: date
    guest_count: int = Field(default=0, ge=0, le=100000)
    fulfilment: FulfilmentMethod = FulfilmentMethod.delivery
    venue: str = Field(default="", max_length=240)
    notes: str = Field(default="", max_length=2000)
    items: list[QuoteItemIn] = Field(default_factory=list, max_length=60)


class QuoteReceipt(BaseModel):
    """Public response — carries no contact details or venue."""

    reference: str
    status: QuoteStatus
    estimated_total: float


class QuoteItemOut(BaseModel):
    equipment_name: str
    category: str
    quantity: int
    daily_rate: float

    model_config = {"from_attributes": True}


class QuoteOut(BaseModel):
    """Staff-only view: includes customer contact details and the venue."""

    id: int
    reference: str
    contact_name: str
    contact_phone: str
    contact_email: str
    organisation: str
    event_type: str
    start_date: date
    end_date: date
    guest_count: int
    fulfilment: FulfilmentMethod
    venue: str
    notes: str
    estimated_total: float | None
    quoted_total: float | None
    status: QuoteStatus
    created_at: datetime
    items: list[QuoteItemOut] = []

    model_config = {"from_attributes": True}
