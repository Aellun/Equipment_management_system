from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_db
from app.crud import reservation as crud
from app.crud import equipment as equipment_crud
from app.crud import client as client_crud
from app.crud import activity as activity_crud
from app.models.reservation import Reservation
from app.schemas.reservation import ReservationCreate, ReservationUpdate, ReservationOut

router = APIRouter(prefix="/reservations", tags=["Reservations"])


def _to_out(r: Reservation) -> ReservationOut:
    out = ReservationOut.model_validate(r)
    if r.equipment:
        out.equipment_name = r.equipment.name
        out.equipment_serial = r.equipment.serial_number
    if r.client:
        out.client_name = r.client.name
    return out


@router.get("/", response_model=list[ReservationOut])
async def list_reservations(status: str | None = None, db: AsyncSession = Depends(get_db)):
    return [_to_out(r) for r in await crud.get_all(db, status=status)]


@router.get("/equipment/{equipment_id}", response_model=list[ReservationOut])
async def reservations_for_equipment(equipment_id: int, db: AsyncSession = Depends(get_db)):
    return [_to_out(r) for r in await crud.get_for_equipment(db, equipment_id)]


@router.post("/", response_model=ReservationOut, status_code=201)
async def create_reservation(payload: ReservationCreate, db: AsyncSession = Depends(get_db)):
    if payload.end_date < payload.start_date:
        raise HTTPException(status_code=400, detail="End date must be on or after the start date")
    equipment = await equipment_crud.get_by_id(db, payload.equipment_id)
    if not equipment:
        raise HTTPException(status_code=404, detail="Equipment not found")
    if equipment.status.value == "Retired":
        raise HTTPException(status_code=400, detail="Retired assets cannot be reserved")
    if not await client_crud.get_by_id(db, payload.client_id):
        raise HTTPException(status_code=404, detail="Client not found")

    conflict = await crud.find_conflict(db, payload.equipment_id, payload.start_date, payload.end_date)
    if conflict:
        raise HTTPException(
            status_code=400,
            detail=(
                f"This unit is already reserved {conflict.start_date} → {conflict.end_date}"
                f" for {conflict.client.name if conflict.client else 'another client'}"
            ),
        )

    reservation = await crud.create(db, payload)
    await activity_crud.log(db, action="reserve", entity_type="equipment",
                            entity_id=equipment.id, entity_name=equipment.name,
                            details={"from": str(payload.start_date), "to": str(payload.end_date)})
    return _to_out(reservation)


@router.patch("/{reservation_id}", response_model=ReservationOut)
async def update_reservation(reservation_id: int, payload: ReservationUpdate, db: AsyncSession = Depends(get_db)):
    reservation = await crud.get_by_id(db, reservation_id)
    if not reservation:
        raise HTTPException(status_code=404, detail="Reservation not found")

    new_start = payload.start_date or reservation.start_date
    new_end = payload.end_date or reservation.end_date
    if new_end < new_start:
        raise HTTPException(status_code=400, detail="End date must be on or after the start date")
    if (payload.start_date or payload.end_date) and reservation.status == "Upcoming":
        conflict = await crud.find_conflict(
            db, reservation.equipment_id, new_start, new_end, exclude_id=reservation.id
        )
        if conflict:
            raise HTTPException(status_code=400, detail="The new dates clash with another reservation")

    return _to_out(await crud.update(db, reservation, payload))


@router.delete("/{reservation_id}", status_code=204)
async def delete_reservation(reservation_id: int, db: AsyncSession = Depends(get_db)):
    reservation = await crud.get_by_id(db, reservation_id)
    if not reservation:
        raise HTTPException(status_code=404, detail="Reservation not found")
    await crud.delete(db, reservation)
