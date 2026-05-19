from datetime import datetime
from pydantic import BaseModel


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
