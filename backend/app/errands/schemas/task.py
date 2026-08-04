from datetime import date, datetime

from pydantic import BaseModel, Field

from app.errands.models.task import Frequency, TaskStatus, Urgency


class QuoteRequest(BaseModel):
    service_type_id: int
    # Errands
    distance_km: float = Field(ge=0, le=200, default=0)
    urgency: Urgency = Urgency.standard
    # Cleaning
    bedrooms: int = Field(ge=0, le=8, default=0)
    bathrooms: int = Field(ge=0, le=6, default=0)
    quantity: int = Field(ge=1, le=500, default=1)
    frequency: Frequency = Frequency.one_off
    extras: list[str] = Field(default_factory=list, max_length=12)


class PriceBreakdown(BaseModel):
    base_price: float
    distance_fee: float
    urgency_fee: float
    size_fee: float = 0.0
    extras_fee: float = 0.0
    frequency_discount: float = 0.0
    service_fee: float
    total_price: float
    goods_paid_separately: bool
    currency: str = "KES"


class ExtraOut(BaseModel):
    """An optional add-on offered during a cleaning booking."""

    slug: str
    label: str
    price: float


class BookingRequest(BaseModel):
    service_type_id: int
    # Errands
    pickup_location: str = Field(max_length=200, default="")
    dropoff_location: str = Field(max_length=200, default="")
    distance_km: float = Field(ge=0, le=200, default=0)
    urgency: Urgency = Urgency.standard
    # Cleaning
    service_address: str = Field(max_length=240, default="")
    scheduled_date: date | None = None
    arrival_window: str = Field(max_length=40, default="")
    frequency: Frequency = Frequency.one_off
    bedrooms: int = Field(ge=0, le=8, default=0)
    bathrooms: int = Field(ge=0, le=6, default=0)
    quantity: int = Field(ge=1, le=500, default=1)
    extras: list[str] = Field(default_factory=list, max_length=12)
    access_notes: str = Field(max_length=2000, default="")
    # Both
    notes: str = Field(max_length=2000, default="")
    phone: str = Field(min_length=9, max_length=20)


class RunnerBrief(BaseModel):
    id: int
    full_name: str
    suburb: str | None = None
    rating_avg: float | None = None
    rating_count: int | None = None


class CustomerBrief(BaseModel):
    """Customer contact — only exposed to the assigned runner, the owner, or admin."""

    full_name: str
    phone: str | None = None


class TaskOut(BaseModel):
    id: int
    reference: str
    service_name: str
    vertical: str = "errands"
    category: str
    status: TaskStatus
    pickup_location: str
    dropoff_location: str
    contact_phone: str | None = None
    distance_km: float
    urgency: Urgency
    notes: str
    # Cleaning bookings
    service_address: str = ""
    scheduled_date: date | None = None
    arrival_window: str = ""
    frequency: Frequency = Frequency.one_off
    bedrooms: int = 0
    bathrooms: int = 0
    quantity: int = 1
    extras: str = ""
    access_notes: str = ""
    base_price: float
    distance_fee: float
    urgency_fee: float
    size_fee: float = 0.0
    extras_fee: float = 0.0
    frequency_discount: float = 0.0
    service_fee: float
    total_price: float
    proof_photo_url: str | None
    proof_note: str
    runner: RunnerBrief | None = None
    customer: CustomerBrief | None = None
    payment_status: str | None = None
    created_at: datetime

    class Config:
        from_attributes = True


class StatusUpdate(BaseModel):
    status: TaskStatus


class ProofSubmit(BaseModel):
    proof_note: str = Field(max_length=400, default="")


class ReviewCreate(BaseModel):
    rating: int = Field(ge=1, le=5)
    comment: str = Field(max_length=500, default="")
