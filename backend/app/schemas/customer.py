from datetime import datetime
from pydantic import BaseModel, EmailStr


class CustomerRegister(BaseModel):
    name: str
    email: EmailStr
    password: str
    phone: str | None = None
    shipping_address: str | None = None


class CustomerLogin(BaseModel):
    email: EmailStr
    password: str


class CustomerUpdate(BaseModel):
    name: str | None = None
    phone: str | None = None
    shipping_address: str | None = None


class CustomerOut(BaseModel):
    id: int
    name: str
    email: EmailStr
    phone: str | None
    shipping_address: str | None
    created_at: datetime

    model_config = {"from_attributes": True}
