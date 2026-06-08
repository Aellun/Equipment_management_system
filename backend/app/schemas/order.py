from datetime import datetime
from decimal import Decimal
from pydantic import BaseModel, EmailStr

from app.models.order import OrderStatus, PaymentStatus


class CheckoutPayload(BaseModel):
    session_token: str
    customer_id: int | None = None
    contact_name: str
    contact_email: EmailStr
    contact_phone: str | None = None
    shipping_address: str
    delivery_zone_id: int | None = None
    delivery_method: str = "door"  # door | pickup


class OrderUpdate(BaseModel):
    status: OrderStatus | None = None
    payment_status: PaymentStatus | None = None
    tracking_note: str | None = None  # optional note attached to a status-change event


class OrderItemOut(BaseModel):
    id: int
    variant_id: int | None
    product_name: str
    variant_name: str
    unit_price: Decimal
    quantity: int
    line_total: Decimal

    model_config = {"from_attributes": True}


class TrackingEventOut(BaseModel):
    id: int
    status: str
    note: str | None
    created_at: datetime

    model_config = {"from_attributes": True}


class OrderOut(BaseModel):
    id: int
    order_number: str
    customer_id: int | None
    status: OrderStatus
    payment_status: PaymentStatus
    contact_name: str
    contact_email: EmailStr
    contact_phone: str | None
    shipping_address: str
    delivery_zone_name: str | None
    delivery_method: str
    delivery_fee: Decimal
    subtotal: Decimal
    total: Decimal
    created_at: datetime
    updated_at: datetime
    items: list[OrderItemOut] = []
    tracking_events: list[TrackingEventOut] = []

    model_config = {"from_attributes": True}


class OrderTrackingOut(BaseModel):
    """Public, privacy-safe view returned by the track-by-code endpoint."""
    order_number: str
    status: OrderStatus
    delivery_method: str
    delivery_zone_name: str | None
    contact_name: str
    created_at: datetime
    items: list[OrderItemOut] = []
    tracking_events: list[TrackingEventOut] = []

    model_config = {"from_attributes": True}
