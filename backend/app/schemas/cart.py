from decimal import Decimal
from pydantic import BaseModel, Field

from app.schemas.product import VariantOut


class CartInit(BaseModel):
    session_token: str | None = None
    customer_id: int | None = None


class CartItemCreate(BaseModel):
    session_token: str
    variant_id: int
    quantity: int = Field(default=1, ge=1)


class CartItemUpdate(BaseModel):
    quantity: int = Field(ge=1)


class CartItemOut(BaseModel):
    id: int
    variant_id: int
    quantity: int
    variant: VariantOut | None = None
    product_name: str | None = None
    product_slug: str | None = None
    image_url: str | None = None
    line_total: Decimal | None = None

    model_config = {"from_attributes": True}


class CartOut(BaseModel):
    id: int
    session_token: str
    customer_id: int | None
    items: list[CartItemOut] = []
    subtotal: Decimal = Decimal("0")

    model_config = {"from_attributes": True}
