from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_db
from app.crud import maintenance as crud
from app.crud import equipment as equipment_crud
from app.crud import activity as activity_crud
from app.models.maintenance import MaintenanceLog
from app.schemas.maintenance import MaintenanceCreate, MaintenanceUpdate, MaintenanceOut

router = APIRouter(prefix="/maintenance", tags=["Maintenance"])


def _to_out(log: MaintenanceLog) -> MaintenanceOut:
    out = MaintenanceOut.model_validate(log)
    if log.equipment:
        out.equipment_name = log.equipment.name
        out.equipment_serial = log.equipment.serial_number
        out.equipment_status = log.equipment.status.value
    return out


@router.get("/", response_model=list[MaintenanceOut])
async def list_logs(status: str | None = None, db: AsyncSession = Depends(get_db)):
    return [_to_out(l) for l in await crud.get_all(db, status=status)]


@router.get("/equipment/{equipment_id}", response_model=list[MaintenanceOut])
async def logs_for_equipment(equipment_id: int, db: AsyncSession = Depends(get_db)):
    return [_to_out(l) for l in await crud.get_for_equipment(db, equipment_id)]


@router.post("/", response_model=MaintenanceOut, status_code=201)
async def create_log(payload: MaintenanceCreate, db: AsyncSession = Depends(get_db)):
    equipment = await equipment_crud.get_by_id(db, payload.equipment_id)
    if not equipment:
        raise HTTPException(status_code=404, detail="Equipment not found")
    if equipment.status.value == "Retired":
        raise HTTPException(status_code=400, detail="Retired assets cannot receive maintenance work logs")
    log = await crud.create(db, payload, equipment)
    await activity_crud.log(db, action="maintenance_open", entity_type="equipment",
                            entity_id=equipment.id, entity_name=equipment.name,
                            details={"title": payload.title})
    return _to_out(log)


@router.patch("/{log_id}", response_model=MaintenanceOut)
async def update_log(log_id: int, payload: MaintenanceUpdate, db: AsyncSession = Depends(get_db)):
    log = await crud.get_by_id(db, log_id)
    if not log:
        raise HTTPException(status_code=404, detail="Maintenance log not found")
    if log.status in ("Completed", "Cancelled") and payload.status in ("Completed", "Cancelled"):
        raise HTTPException(status_code=400, detail="This work log is already closed")
    updated = await crud.update(db, log, payload)
    if payload.status in ("Completed", "Cancelled"):
        await activity_crud.log(db, action=f"maintenance_{payload.status.lower().replace(' ', '_')}",
                                entity_type="equipment", entity_id=log.equipment_id,
                                entity_name=updated.equipment.name if updated.equipment else None,
                                details={"title": updated.title})
    return _to_out(updated)
