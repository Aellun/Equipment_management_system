from datetime import datetime, date
from typing import Literal
from pydantic import BaseModel

ReservationStatus = Literal["Upcoming", "Fulfilled", "Cancelled"]


class ReservationCreate(BaseModel):
    equipment_id: int
    client_id: int
    start_date: date
    end_date: date
    notes: str | None = None


class ReservationUpdate(BaseModel):
    start_date: date | None = None
    end_date: date | None = None
    status: ReservationStatus | None = None
    notes: str | None = None


class ReservationOut(BaseModel):
    id: int
    equipment_id: int
    client_id: int
    start_date: date
    end_date: date
    status: str
    notes: str | None
    created_at: datetime
    # flattened context for list views
    equipment_name: str | None = None
    equipment_serial: str | None = None
    client_name: str | None = None

    model_config = {"from_attributes": True}
