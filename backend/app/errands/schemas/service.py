from pydantic import BaseModel

from app.errands.models.service import QuoteMode


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
    # Drives which booking path the storefront shows for this service.
    quote_mode: QuoteMode = QuoteMode.distance
    included_bedrooms: int = 2
    included_bathrooms: int = 1

    class Config:
        from_attributes = True


class ServiceUpdate(BaseModel):
    base_price: float | None = None
    est_minutes: int | None = None
    is_active: bool | None = None
    description: str | None = None
