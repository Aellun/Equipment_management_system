from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from fastapi import HTTPException

from app.models.category import Category
from app.schemas.category import CategoryCreate, CategoryUpdate


async def get_all(db: AsyncSession) -> list[Category]:
    result = await db.execute(select(Category).order_by(Category.name))
    return list(result.scalars().all())


async def create(db: AsyncSession, payload: CategoryCreate) -> Category:
    existing = await db.execute(select(Category).where(Category.name == payload.name))
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=409, detail=f"Category '{payload.name}' already exists")
    category = Category(name=payload.name, description=payload.description)
    db.add(category)
    await db.commit()
    await db.refresh(category)
    return category


async def update(db: AsyncSession, category_id: int, payload: CategoryUpdate) -> Category:
    result = await db.execute(select(Category).where(Category.id == category_id))
    category = result.scalar_one_or_none()
    if not category:
        raise HTTPException(status_code=404, detail="Category not found")
    if payload.name is not None:
        existing = await db.execute(
            select(Category).where(Category.name == payload.name, Category.id != category_id)
        )
        if existing.scalar_one_or_none():
            raise HTTPException(status_code=409, detail=f"Category '{payload.name}' already exists")
        category.name = payload.name
    if payload.description is not None:
        category.description = payload.description
    await db.commit()
    await db.refresh(category)
    return category


async def delete(db: AsyncSession, category_id: int) -> None:
    result = await db.execute(select(Category).where(Category.id == category_id))
    category = result.scalar_one_or_none()
    if not category:
        raise HTTPException(status_code=404, detail="Category not found")
    await db.delete(category)
    await db.commit()
