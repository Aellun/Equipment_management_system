from decimal import Decimal
from pydantic import BaseModel, Field


class DeliveryZoneCreate(BaseModel):
    name: str
    description: str | None = None
    door_fee: Decimal = Field(default=0, ge=0)
    pickup_fee: Decimal = Field(default=0, ge=0)
    eta_days_min: int = Field(default=1, ge=0)
    eta_days_max: int = Field(default=3, ge=0)
    free_over: Decimal | None = None
    is_active: bool = True
    sort_order: int = 0


class DeliveryZoneUpdate(BaseModel):
    name: str | None = None
    description: str | None = None
    door_fee: Decimal | None = Field(default=None, ge=0)
    pickup_fee: Decimal | None = Field(default=None, ge=0)
    eta_days_min: int | None = None
    eta_days_max: int | None = None
    free_over: Decimal | None = None
    is_active: bool | None = None
    sort_order: int | None = None


class DeliveryZoneOut(BaseModel):
    id: int
    name: str
    description: str | None
    door_fee: Decimal
    pickup_fee: Decimal
    eta_days_min: int
    eta_days_max: int
    free_over: Decimal | None
    is_active: bool
    sort_order: int

    model_config = {"from_attributes": True}
