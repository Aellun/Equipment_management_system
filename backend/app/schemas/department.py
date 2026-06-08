from datetime import datetime
from pydantic import BaseModel, Field


class DepartmentCreate(BaseModel):
    name: str
    tagline: str | None = None
    description: str | None = None
    attribute_labels: list[str] = Field(default_factory=list)
    icon: str | None = None
    is_active: bool = True
    sort_order: int = 0


class DepartmentUpdate(BaseModel):
    name: str | None = None
    tagline: str | None = None
    description: str | None = None
    attribute_labels: list[str] | None = None
    icon: str | None = None
    is_active: bool | None = None
    sort_order: int | None = None


class DepartmentOut(BaseModel):
    id: int
    name: str
    slug: str
    tagline: str | None
    description: str | None
    attribute_labels: list[str] | None
    icon: str | None
    is_active: bool
    sort_order: int
    created_at: datetime

    model_config = {"from_attributes": True}


class StoreSettingUpdate(BaseModel):
    key: str
    value: str | None = None


class StoreSettingOut(BaseModel):
    key: str
    value: str | None

    model_config = {"from_attributes": True}
