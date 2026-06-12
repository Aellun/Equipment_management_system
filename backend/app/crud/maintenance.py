from datetime import datetime, timezone

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from app.models.maintenance import MaintenanceLog
from app.models.equipment import Equipment, EquipmentStatus
from app.schemas.maintenance import MaintenanceCreate, MaintenanceUpdate

_LOAD = (selectinload(MaintenanceLog.equipment),)


async def get_all(db: AsyncSession, status: str | None = None) -> list[MaintenanceLog]:
    stmt = select(MaintenanceLog).options(*_LOAD).order_by(MaintenanceLog.reported_at.desc())
    if status:
        stmt = stmt.where(MaintenanceLog.status == status)
    result = await db.execute(stmt)
    return list(result.scalars().all())


async def get_for_equipment(db: AsyncSession, equipment_id: int) -> list[MaintenanceLog]:
    result = await db.execute(
        select(MaintenanceLog).options(*_LOAD)
        .where(MaintenanceLog.equipment_id == equipment_id)
        .order_by(MaintenanceLog.reported_at.desc())
    )
    return list(result.scalars().all())


async def get_by_id(db: AsyncSession, log_id: int) -> MaintenanceLog | None:
    result = await db.execute(
        select(MaintenanceLog).options(*_LOAD).where(MaintenanceLog.id == log_id)
    )
    return result.scalar_one_or_none()


async def has_open_logs(db: AsyncSession, equipment_id: int, exclude_id: int | None = None) -> bool:
    stmt = select(MaintenanceLog.id).where(
        MaintenanceLog.equipment_id == equipment_id,
        MaintenanceLog.status.in_(["Open", "In Progress"]),
    )
    if exclude_id is not None:
        stmt = stmt.where(MaintenanceLog.id != exclude_id)
    result = await db.execute(stmt.limit(1))
    return result.scalar_one_or_none() is not None


async def create(db: AsyncSession, payload: MaintenanceCreate, equipment: Equipment) -> MaintenanceLog:
    """Open a work log. Pulls an Available unit out of service immediately."""
    log = MaintenanceLog(
        equipment_id=payload.equipment_id,
        title=payload.title,
        description=payload.description,
        cost=payload.cost,
    )
    db.add(log)
    if equipment.status == EquipmentStatus.available:
        equipment.status = EquipmentStatus.maintenance
    await db.commit()
    return await get_by_id(db, log.id)


async def update(db: AsyncSession, log: MaintenanceLog, payload: MaintenanceUpdate) -> MaintenanceLog:
    """Update a work log; closing the last open log returns the unit to service."""
    data = payload.model_dump(exclude_unset=True)
    closing = data.get("status") in ("Completed", "Cancelled") and log.status in ("Open", "In Progress")
    for field, value in data.items():
        setattr(log, field, value)

    if closing:
        log.completed_at = datetime.now(timezone.utc)
        equipment = await db.get(Equipment, log.equipment_id)
        if equipment and equipment.status == EquipmentStatus.maintenance:
            if not await has_open_logs(db, log.equipment_id, exclude_id=log.id):
                equipment.status = EquipmentStatus.available
                if data.get("status") == "Completed":
                    equipment.last_inspected = datetime.now(timezone.utc)

    await db.commit()
    return await get_by_id(db, log.id)
