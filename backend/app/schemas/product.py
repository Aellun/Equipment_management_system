from datetime import datetime
from decimal import Decimal
from pydantic import BaseModel, Field


# ---- Variants ----
class VariantCreate(BaseModel):
    variant_name: str
    price: Decimal = Field(ge=0)
    stock_qty: int = Field(default=0, ge=0)
    attributes: dict | None = None
    sku: str | None = None  # auto-generated if omitted
    is_active: bool = True
    # At create time images don't have IDs yet; reference one by its position in image_urls
    image_index: int | None = None


class VariantUpdate(BaseModel):
    variant_name: str | None = None
    price: Decimal | None = Field(default=None, ge=0)
    stock_qty: int | None = Field(default=None, ge=0)
    attributes: dict | None = None
    is_active: bool | None = None
    image_id: int | None = None


class VariantOut(BaseModel):
    id: int
    product_id: int
    sku: str
    variant_name: str
    price: Decimal
    stock_qty: int
    attributes: dict | None
    is_active: bool
    image_id: int | None = None

    model_config = {"from_attributes": True}


# ---- Images ----
class ImageCreate(BaseModel):
    url: str
    sort_order: int = 0


class ImageOut(BaseModel):
    id: int
    product_id: int
    url: str
    sort_order: int

    model_config = {"from_attributes": True}


# ---- Products ----
class ProductCreate(BaseModel):
    name: str
    description: str | None = None
    usage_guide: str | None = None
    brand: str | None = None
    department_id: int | None = None
    shop_category_id: int | None = None
    base_price: Decimal = Field(default=0, ge=0)
    is_active: bool = True
    is_genuine_guaranteed: bool = True
    variants: list[VariantCreate] = Field(default_factory=list)
    image_urls: list[str] = Field(default_factory=list)


class ProductUpdate(BaseModel):
    name: str | None = None
    description: str | None = None
    usage_guide: str | None = None
    brand: str | None = None
    department_id: int | None = None
    shop_category_id: int | None = None
    base_price: Decimal | None = Field(default=None, ge=0)
    is_active: bool | None = None
    is_genuine_guaranteed: bool | None = None


class ProductOut(BaseModel):
    id: int
    name: str
    slug: str
    description: str | None
    usage_guide: str | None
    brand: str | None
    department_id: int | None
    shop_category_id: int | None
    base_price: Decimal
    is_active: bool
    is_genuine_guaranteed: bool
    created_at: datetime
    variants: list[VariantOut] = []
    images: list[ImageOut] = []
    # review aggregates (populated by storefront endpoints)
    avg_rating: float | None = None
    review_count: int = 0

    model_config = {"from_attributes": True}
