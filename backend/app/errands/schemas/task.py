from datetime import datetime

from pydantic import BaseModel, Field

from app.errands.models.task import TaskStatus, Urgency


class QuoteRequest(BaseModel):
    service_type_id: int
    distance_km: float = Field(ge=0, le=200, default=0)
    urgency: Urgency = Urgency.standard


class PriceBreakdown(BaseModel):
    base_price: float
    distance_fee: float
    urgency_fee: float
    service_fee: float
    total_price: float
    goods_paid_separately: bool
    currency: str = "KES"


class BookingRequest(BaseModel):
    service_type_id: int
    pickup_location: str = Field(max_length=200, default="")
    dropoff_location: str = Field(max_length=200, default="")
    distance_km: float = Field(ge=0, le=200, default=0)
    urgency: Urgency = Urgency.standard
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
    base_price: float
    distance_fee: float
    urgency_fee: float
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
