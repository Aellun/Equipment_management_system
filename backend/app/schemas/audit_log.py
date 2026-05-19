from datetime import datetime

from pydantic import BaseModel

from app.models.audit_log import ConditionOnReturn


class CheckinPayload(BaseModel):
    condition_on_return: ConditionOnReturn
    notes: str | None = None


class AuditLogOut(BaseModel):
    id: int
    transaction_id: int
    return_timestamp: datetime
    condition_on_return: ConditionOnReturn
    notes: str | None

    model_config = {"from_attributes": True}


class ActivityLogOut(BaseModel):
    id: int
    timestamp: datetime
    action: str
    entity_type: str
    entity_id: int | None
    entity_name: str | None
    performed_by: str | None
    details: str | None
    model_config = {"from_attributes": True}
