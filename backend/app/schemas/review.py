from datetime import datetime
from pydantic import BaseModel, Field

from app.models.review import ReviewType


class ReviewCreate(BaseModel):
    review_type: ReviewType = ReviewType.product
    product_id: int | None = None
    rating: int = Field(ge=1, le=5)
    title: str | None = None
    body: str | None = None
    reviewer_name: str
    reviewer_email: str | None = None


class ReviewOut(BaseModel):
    id: int
    review_type: ReviewType
    product_id: int | None
    rating: int
    title: str | None
    body: str | None
    reviewer_name: str
    verified_purchase: bool
    created_at: datetime

    model_config = {"from_attributes": True}


class ReviewSummary(BaseModel):
    avg_rating: float | None
    review_count: int
    breakdown: dict[int, int]  # star -> count
