from datetime import datetime
from pydantic import BaseModel

from app.models.return_request import ReturnStatus


class ReturnCreate(BaseModel):
    order_number: str
    reason: str
    details: str | None = None
    contact_email: str


class ReturnUpdate(BaseModel):
    status: ReturnStatus | None = None
    admin_note: str | None = None


class ReturnOut(BaseModel):
    id: int
    order_id: int
    reason: str
    details: str | None
    contact_email: str
    status: ReturnStatus
    admin_note: str | None
    created_at: datetime
    updated_at: datetime
    order_number: str | None = None

    model_config = {"from_attributes": True}
