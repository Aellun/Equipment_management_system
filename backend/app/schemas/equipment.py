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
    created_at: datetime

    model_config = {"from_attributes": True}


class EquipmentGroupUpdate(BaseModel):
    current_name: str
    new_name: str | None = None
    new_category: str | None = None
