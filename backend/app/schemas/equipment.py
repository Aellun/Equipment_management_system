from datetime import datetime, date
from decimal import Decimal
from pydantic import BaseModel, Field

from app.models.equipment import EquipmentStatus


class EquipmentCreate(BaseModel):
    name: str
    category: str
    quantity: int = Field(default=1, ge=1, le=200)
    location: str | None = None
    purchase_date: date | None = None
    purchase_cost: Decimal | None = Field(default=None, ge=0)
    supplier: str | None = None
    warranty_expiry: date | None = None
    notes: str | None = None


class EquipmentUpdate(BaseModel):
    name: str | None = None
    category: str | None = None
    daily_rate: Decimal | None = Field(default=None, ge=0)
    description: str | None = None
    image_url: str | None = None
    is_public: bool | None = None
    status: EquipmentStatus | None = None
    location: str | None = None
    purchase_date: date | None = None
    purchase_cost: Decimal | None = Field(default=None, ge=0)
    supplier: str | None = None
    warranty_expiry: date | None = None
    notes: str | None = None


class EquipmentOut(BaseModel):
    id: int
    name: str
    serial_number: str
    category: str
    status: EquipmentStatus
    last_inspected: datetime | None
    location: str | None = None
    purchase_date: date | None = None
    purchase_cost: Decimal | None = None
    supplier: str | None = None
    warranty_expiry: date | None = None
    notes: str | None = None
    daily_rate: Decimal | None = None
    description: str | None = None
    image_url: str | None = None
    is_public: bool = False
    created_at: datetime

    model_config = {"from_attributes": True}


class EquipmentGroupUpdate(BaseModel):
    current_name: str
    new_name: str | None = None
    new_category: str | None = None
    # Storefront fields apply to the whole group — customers hire "round
    # tables", not individual serial numbers, so rate and listing copy are
    # set once and inherited by every unit.
    daily_rate: Decimal | None = Field(default=None, ge=0)
    description: str | None = None
    image_url: str | None = None
    is_public: bool | None = None
