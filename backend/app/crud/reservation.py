from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from app.models.reservation import Reservation
from app.schemas.reservation import ReservationCreate, ReservationUpdate

_LOAD = (selectinload(Reservation.equipment), selectinload(Reservation.client))


async def get_all(db: AsyncSession, status: str | None = None) -> list[Reservation]:
    stmt = select(Reservation).options(*_LOAD).order_by(Reservation.start_date, Reservation.id)
    if status:
        stmt = stmt.where(Reservation.status == status)
    result = await db.execute(stmt)
    return list(result.scalars().all())


async def get_for_equipment(db: AsyncSession, equipment_id: int) -> list[Reservation]:
    result = await db.execute(
        select(Reservation).options(*_LOAD)
        .where(Reservation.equipment_id == equipment_id)
        .order_by(Reservation.start_date.desc())
    )
    return list(result.scalars().all())


async def get_by_id(db: AsyncSession, reservation_id: int) -> Reservation | None:
    result = await db.execute(
        select(Reservation).options(*_LOAD).where(Reservation.id == reservation_id)
    )
    return result.scalar_one_or_none()


async def find_conflict(
    db: AsyncSession, equipment_id: int, start, end, exclude_id: int | None = None
) -> Reservation | None:
    """An Upcoming reservation for the same unit whose date range overlaps."""
    stmt = (
        select(Reservation).options(*_LOAD)
        .where(
            Reservation.equipment_id == equipment_id,
            Reservation.status == "Upcoming",
            Reservation.start_date <= end,
            Reservation.end_date >= start,
        )
    )
    if exclude_id is not None:
        stmt = stmt.where(Reservation.id != exclude_id)
    result = await db.execute(stmt.limit(1))
    return result.scalar_one_or_none()


async def create(db: AsyncSession, payload: ReservationCreate) -> Reservation:
    reservation = Reservation(**payload.model_dump())
    db.add(reservation)
    await db.commit()
    return await get_by_id(db, reservation.id)


async def update(db: AsyncSession, reservation: Reservation, payload: ReservationUpdate) -> Reservation:
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(reservation, field, value)
    await db.commit()
    return await get_by_id(db, reservation.id)


async def delete(db: AsyncSession, reservation: Reservation) -> None:
    await db.delete(reservation)
    await db.commit()
