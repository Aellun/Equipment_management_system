from pydantic import BaseModel


class ServiceOut(BaseModel):
    id: int
    slug: str
    name: str
    vertical: str
    category: str
    description: str
    icon: str
    base_price: float
    price_unit: str
    est_minutes: int
    goods_paid_separately: bool
    is_active: bool

    class Config:
        from_attributes = True


class ServiceUpdate(BaseModel):
    base_price: float | None = None
    est_minutes: int | None = None
    is_active: bool | None = None
    description: str | None = None
