from datetime import datetime
from decimal import Decimal
from typing import Literal
from pydantic import BaseModel, Field

MaintenanceStatus = Literal["Open", "In Progress", "Completed", "Cancelled"]


class MaintenanceCreate(BaseModel):
    equipment_id: int
    title: str
    description: str | None = None
    cost: Decimal | None = Field(default=None, ge=0)


class MaintenanceUpdate(BaseModel):
    title: str | None = None
    description: str | None = None
    status: MaintenanceStatus | None = None
    cost: Decimal | None = Field(default=None, ge=0)
    resolution_notes: str | None = None


class MaintenanceOut(BaseModel):
    id: int
    equipment_id: int
    title: str
    description: str | None
    status: str
    cost: Decimal | None
    reported_at: datetime
    completed_at: datetime | None
    resolution_notes: str | None
    # flattened context for list views
    equipment_name: str | None = None
    equipment_serial: str | None = None
    equipment_status: str | None = None

    model_config = {"from_attributes": True}
