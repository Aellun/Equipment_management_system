from datetime import datetime
from pydantic import BaseModel


class ShopCategoryCreate(BaseModel):
    name: str
    description: str | None = None


class ShopCategoryUpdate(BaseModel):
    name: str | None = None
    description: str | None = None


class ShopCategoryOut(BaseModel):
    id: int
    name: str
    slug: str
    description: str | None
    created_at: datetime

    model_config = {"from_attributes": True}
