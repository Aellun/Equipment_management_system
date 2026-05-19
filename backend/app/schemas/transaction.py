from datetime import datetime

from pydantic import BaseModel

from app.schemas.equipment import EquipmentOut
from app.schemas.client import ClientOut
from app.schemas.audit_log import AuditLogOut


class CheckoutPayload(BaseModel):
    equipment_id: int
    client_id: int
    due_date: datetime
    staff_out_id: str


class BulkCheckoutPayload(BaseModel):
    equipment_ids: list[int]
    client_id: int
    due_date: datetime
    staff_out_id: str


class TransactionOut(BaseModel):
    id: int
    equipment_id: int
    client_id: int
    out_timestamp: datetime
    due_date: datetime
    staff_out_id: str
    equipment: EquipmentOut | None = None
    client: ClientOut | None = None
    audit_log: AuditLogOut | None = None

    model_config = {"from_attributes": True}
