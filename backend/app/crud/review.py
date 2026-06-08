from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func

from app.models.review import Review, ReviewType
from app.models.order import Order, OrderItem
from app.models.product import ProductVariant
from app.schemas.review import ReviewCreate


async def _is_verified_purchase(db: AsyncSession, email: str | None, product_id: int | None) -> bool:
    """A review counts as verified if the email matches an order that contains the product."""
    if not email:
        return False
    if product_id is None:
        stmt = (
            select(func.count())
            .select_from(Order)
            .where(func.lower(Order.contact_email) == email.lower())
        )
    else:
        stmt = (
            select(func.count())
            .select_from(Order)
            .join(OrderItem, OrderItem.order_id == Order.id)
            .join(ProductVariant, ProductVariant.id == OrderItem.variant_id)
            .where(func.lower(Order.contact_email) == email.lower())
            .where(ProductVariant.product_id == product_id)
        )
    count = (await db.execute(stmt)).scalar_one()
    return count > 0


async def create(db: AsyncSession, payload: ReviewCreate) -> Review:
    verified = await _is_verified_purchase(db, payload.reviewer_email, payload.product_id)
    review = Review(
        review_type=payload.review_type,
        product_id=payload.product_id if payload.review_type == ReviewType.product else None,
        rating=payload.rating,
        title=payload.title,
        body=payload.body,
        reviewer_name=payload.reviewer_name,
        reviewer_email=payload.reviewer_email,
        verified_purchase=verified,
    )
    db.add(review)
    await db.commit()
    await db.refresh(review)
    return review


async def for_product(db: AsyncSession, product_id: int) -> list[Review]:
    result = await db.execute(
        select(Review)
        .where(Review.product_id == product_id, Review.is_published.is_(True))
        .order_by(Review.created_at.desc())
    )
    return list(result.scalars().all())


async def store_reviews(db: AsyncSession) -> list[Review]:
    result = await db.execute(
        select(Review)
        .where(Review.review_type == ReviewType.store, Review.is_published.is_(True))
        .order_by(Review.created_at.desc())
    )
    return list(result.scalars().all())


async def summary_for_product(db: AsyncSession, product_id: int) -> dict:
    rows = (await db.execute(
        select(Review.rating).where(Review.product_id == product_id, Review.is_published.is_(True))
    )).scalars().all()
    return _summarize(rows)


async def store_summary(db: AsyncSession) -> dict:
    rows = (await db.execute(
        select(Review.rating).where(Review.review_type == ReviewType.store, Review.is_published.is_(True))
    )).scalars().all()
    return _summarize(rows)


async def aggregates_by_product(db: AsyncSession) -> dict[int, tuple[float, int]]:
    """Returns {product_id: (avg_rating, count)} for all products with reviews."""
    rows = (await db.execute(
        select(Review.product_id, func.avg(Review.rating), func.count())
        .where(Review.review_type == ReviewType.product, Review.is_published.is_(True), Review.product_id.isnot(None))
        .group_by(Review.product_id)
    )).all()
    return {pid: (round(float(avg), 2), int(cnt)) for pid, avg, cnt in rows}


def _summarize(ratings: list[int]) -> dict:
    count = len(ratings)
    avg = round(sum(ratings) / count, 2) if count else None
    breakdown = {star: 0 for star in range(1, 6)}
    for r in ratings:
        breakdown[r] = breakdown.get(r, 0) + 1
    return {"avg_rating": avg, "review_count": count, "breakdown": breakdown}


async def get_all(db: AsyncSession) -> list[Review]:
    result = await db.execute(select(Review).order_by(Review.created_at.desc()))
    return list(result.scalars().all())


async def get_by_id(db: AsyncSession, review_id: int) -> Review | None:
    result = await db.execute(select(Review).where(Review.id == review_id))
    return result.scalar_one_or_none()


async def delete(db: AsyncSession, review: Review) -> None:
    await db.delete(review)
    await db.commit()
