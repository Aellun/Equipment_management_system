from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.models.department import Department, StoreSetting
from app.schemas.department import DepartmentCreate, DepartmentUpdate
from app.crud.slug import unique_slug


async def get_all(db: AsyncSession, active_only: bool = False) -> list[Department]:
    stmt = select(Department).order_by(Department.sort_order, Department.name)
    if active_only:
        stmt = stmt.where(Department.is_active.is_(True))
    result = await db.execute(stmt)
    return list(result.scalars().all())


async def get_by_id(db: AsyncSession, dept_id: int) -> Department | None:
    result = await db.execute(select(Department).where(Department.id == dept_id))
    return result.scalar_one_or_none()


async def create(db: AsyncSession, payload: DepartmentCreate) -> Department:
    dept = Department(
        name=payload.name,
        tagline=payload.tagline,
        description=payload.description,
        attribute_labels=payload.attribute_labels,
        icon=payload.icon,
        is_active=payload.is_active,
        sort_order=payload.sort_order,
        slug=await unique_slug(db, Department, payload.name),
    )
    db.add(dept)
    await db.commit()
    await db.refresh(dept)
    return dept


async def update(db: AsyncSession, dept: Department, payload: DepartmentUpdate) -> Department:
    data = payload.model_dump(exclude_unset=True)
    if "name" in data and data["name"] and data["name"] != dept.name:
        dept.slug = await unique_slug(db, Department, data["name"])
    for field, value in data.items():
        setattr(dept, field, value)
    await db.commit()
    await db.refresh(dept)
    return dept


async def delete(db: AsyncSession, dept: Department) -> None:
    await db.delete(dept)
    await db.commit()


# ---- Store settings (key/value) ----
async def get_settings(db: AsyncSession) -> dict[str, str | None]:
    result = await db.execute(select(StoreSetting))
    return {s.key: s.value for s in result.scalars().all()}


async def set_setting(db: AsyncSession, key: str, value: str | None) -> None:
    existing = (await db.execute(select(StoreSetting).where(StoreSetting.key == key))).scalar_one_or_none()
    if existing:
        existing.value = value
    else:
        db.add(StoreSetting(key=key, value=value))
    await db.commit()
