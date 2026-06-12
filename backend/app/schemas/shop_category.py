from datetime import datetime
from pydantic import BaseModel


class ShopCategoryCreate(BaseModel):
    name: str
    description: str | None = None
    is_active: bool = True


class ShopCategoryUpdate(BaseModel):
    name: str | None = None
    description: str | None = None
    is_active: bool | None = None


class ShopCategoryOut(BaseModel):
    id: int
    name: str
    slug: str
    description: str | None
    is_active: bool
    created_at: datetime

    model_config = {"from_attributes": True}
