import uuid
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.models.equipment import Equipment
from app.schemas.equipment import EquipmentCreate, EquipmentUpdate


def _generate_serial(name: str, category: str) -> str:
    prefix = f"{category[:3].upper()}-{name[:3].upper()}"
    suffix = uuid.uuid4().hex[:6].upper()
    return f"{prefix}-{suffix}"


async def get_all(db: AsyncSession) -> list[Equipment]:
    result = await db.execute(select(Equipment).order_by(Equipment.name, Equipment.id))
    return list(result.scalars().all())


async def get_by_id(db: AsyncSession, equipment_id: int) -> Equipment | None:
    result = await db.execute(select(Equipment).where(Equipment.id == equipment_id))
    return result.scalar_one_or_none()


async def create(db: AsyncSession, payload: EquipmentCreate) -> list[Equipment]:
    items = []
    for _ in range(payload.quantity):
        item = Equipment(
            name=payload.name,
            category=payload.category,
            serial_number=_generate_serial(payload.name, payload.category),
            location=payload.location,
            purchase_date=payload.purchase_date,
            purchase_cost=payload.purchase_cost,
            supplier=payload.supplier,
            warranty_expiry=payload.warranty_expiry,
            notes=payload.notes,
        )
        db.add(item)
        items.append(item)
    await db.commit()
    for item in items:
        await db.refresh(item)
    return items


async def update(db: AsyncSession, equipment: Equipment, payload: EquipmentUpdate) -> Equipment:
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(equipment, field, value)
    await db.commit()
    await db.refresh(equipment)
    return equipment


async def delete(db: AsyncSession, equipment: Equipment) -> None:
    await db.delete(equipment)
    await db.commit()


async def get_by_name(db: AsyncSession, name: str) -> list[Equipment]:
    result = await db.execute(select(Equipment).where(Equipment.name == name))
    return list(result.scalars().all())


async def bulk_update(db: AsyncSession, name: str, payload) -> list[Equipment]:
    items = await get_by_name(db, name)
    for item in items:
        if payload.new_name:
            item.name = payload.new_name
        if payload.new_category:
            item.category = payload.new_category
        # Storefront fields: `is not None` rather than truthiness, so a rate of
        # 0 or an explicit unpublish (False) is applied instead of ignored.
        for field, value in (
            ("daily_rate", getattr(payload, "daily_rate", None)),
            ("description", getattr(payload, "description", None)),
            ("image_url", getattr(payload, "image_url", None)),
            ("is_public", getattr(payload, "is_public", None)),
        ):
            if value is not None:
                setattr(item, field, value)
    await db.commit()
    for item in items:
        await db.refresh(item)
    return items


async def delete_by_name(db: AsyncSession, name: str) -> int:
    items = await get_by_name(db, name)
    available = [i for i in items if i.status.value == "Available"]
    for item in available:
        await db.delete(item)
    if available:
        await db.commit()
    return len(available)
