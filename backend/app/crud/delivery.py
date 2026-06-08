from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.models.delivery import DeliveryZone
from app.schemas.delivery import DeliveryZoneCreate, DeliveryZoneUpdate


async def get_all(db: AsyncSession, active_only: bool = False) -> list[DeliveryZone]:
    stmt = select(DeliveryZone).order_by(DeliveryZone.sort_order, DeliveryZone.id)
    if active_only:
        stmt = stmt.where(DeliveryZone.is_active.is_(True))
    result = await db.execute(stmt)
    return list(result.scalars().all())


async def get_by_id(db: AsyncSession, zone_id: int) -> DeliveryZone | None:
    result = await db.execute(select(DeliveryZone).where(DeliveryZone.id == zone_id))
    return result.scalar_one_or_none()


async def create(db: AsyncSession, payload: DeliveryZoneCreate) -> DeliveryZone:
    zone = DeliveryZone(**payload.model_dump())
    db.add(zone)
    await db.commit()
    await db.refresh(zone)
    return zone


async def update(db: AsyncSession, zone: DeliveryZone, payload: DeliveryZoneUpdate) -> DeliveryZone:
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(zone, field, value)
    await db.commit()
    await db.refresh(zone)
    return zone


async def delete(db: AsyncSession, zone: DeliveryZone) -> None:
    await db.delete(zone)
    await db.commit()
