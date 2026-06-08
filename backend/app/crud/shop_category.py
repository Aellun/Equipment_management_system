from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.models.shop_category import ShopCategory
from app.schemas.shop_category import ShopCategoryCreate, ShopCategoryUpdate
from app.crud.slug import unique_slug


async def get_all(db: AsyncSession) -> list[ShopCategory]:
    result = await db.execute(select(ShopCategory).order_by(ShopCategory.name))
    return list(result.scalars().all())


async def get_by_id(db: AsyncSession, category_id: int) -> ShopCategory | None:
    result = await db.execute(select(ShopCategory).where(ShopCategory.id == category_id))
    return result.scalar_one_or_none()


async def get_by_slug(db: AsyncSession, slug: str) -> ShopCategory | None:
    result = await db.execute(select(ShopCategory).where(ShopCategory.slug == slug))
    return result.scalar_one_or_none()


async def create(db: AsyncSession, payload: ShopCategoryCreate) -> ShopCategory:
    category = ShopCategory(
        name=payload.name,
        description=payload.description,
        slug=await unique_slug(db, ShopCategory, payload.name),
    )
    db.add(category)
    await db.commit()
    await db.refresh(category)
    return category


async def update(db: AsyncSession, category: ShopCategory, payload: ShopCategoryUpdate) -> ShopCategory:
    data = payload.model_dump(exclude_unset=True)
    if "name" in data and data["name"] and data["name"] != category.name:
        category.slug = await unique_slug(db, ShopCategory, data["name"])
    for field, value in data.items():
        setattr(category, field, value)
    await db.commit()
    await db.refresh(category)
    return category


async def delete(db: AsyncSession, category: ShopCategory) -> None:
    await db.delete(category)
    await db.commit()
