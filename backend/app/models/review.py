import enum
from datetime import datetime

from sqlalchemy import String, Text, Integer, DateTime, ForeignKey, Boolean, Enum as SQLEnum, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class ReviewType(str, enum.Enum):
    product = "Product"
    store = "Store"


class Review(Base):
    """Customer review for a product or for the store overall.

    Guest reviews are allowed (no login in storefront); a review is flagged
    `verified_purchase` when the reviewer's email matches a real delivered/paid
    order containing the product.
    """

    __tablename__ = "reviews"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    review_type: Mapped[ReviewType] = mapped_column(
        SQLEnum(ReviewType, values_callable=lambda x: [e.value for e in x]),
        default=ReviewType.product, nullable=False,
    )
    product_id: Mapped[int | None] = mapped_column(
        ForeignKey("products.id", ondelete="CASCADE"), nullable=True
    )
    rating: Mapped[int] = mapped_column(Integer, nullable=False)  # 1..5
    title: Mapped[str | None] = mapped_column(String(255), nullable=True)
    body: Mapped[str | None] = mapped_column(Text, nullable=True)
    reviewer_name: Mapped[str] = mapped_column(String(255), nullable=False)
    reviewer_email: Mapped[str | None] = mapped_column(String(255), nullable=True)
    verified_purchase: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    is_published: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    product: Mapped["Product | None"] = relationship("Product")
