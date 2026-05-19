from datetime import datetime

from pydantic import BaseModel


class ClientBase(BaseModel):
    name: str
    email: str
    phone: str | None = None
    id_proof_ref: str | None = None


class ClientCreate(ClientBase):
    pass


class ClientUpdate(BaseModel):
    name: str | None = None
    email: str | None = None
    phone: str | None = None
    id_proof_ref: str | None = None


class ClientOut(ClientBase):
    id: int
    created_at: datetime

    model_config = {"from_attributes": True}
