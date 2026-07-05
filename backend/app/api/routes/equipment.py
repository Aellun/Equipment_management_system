import csv
import io

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_db, require_staff
from app.crud import equipment as crud
from app.crud import activity as activity_crud
from app.schemas.equipment import EquipmentCreate, EquipmentUpdate, EquipmentOut, EquipmentGroupUpdate

router = APIRouter(prefix="/equipment", tags=["Equipment"], dependencies=[Depends(require_staff)])


@router.get("/export.csv")
async def export_register(db: AsyncSession = Depends(get_db)):
    """Download the full asset register as CSV."""
    items = await crud.get_all(db)
    buf = io.StringIO()
    writer = csv.writer(buf)
    writer.writerow([
        "ID", "Name", "Serial Number", "Category", "Status", "Location",
        "Supplier", "Purchase Date", "Purchase Cost", "Warranty Expiry",
        "Last Inspected", "Registered", "Notes",
    ])
    for e in items:
        writer.writerow([
            e.id, e.name, e.serial_number, e.category, e.status.value,
            e.location or "", e.supplier or "",
            e.purchase_date.isoformat() if e.purchase_date else "",
            f"{e.purchase_cost:.2f}" if e.purchase_cost is not None else "",
            e.warranty_expiry.isoformat() if e.warranty_expiry else "",
            e.last_inspected.date().isoformat() if e.last_inspected else "",
            e.created_at.date().isoformat() if e.created_at else "",
            (e.notes or "").replace("\n", " "),
        ])
    buf.seek(0)
    return StreamingResponse(
        iter([buf.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=equipment-register.csv"},
    )


@router.get("/", response_model=list[EquipmentOut])
async def list_equipment(db: AsyncSession = Depends(get_db)):
    return await crud.get_all(db)


@router.post("/", response_model=list[EquipmentOut], status_code=201)
async def create_equipment(payload: EquipmentCreate, db: AsyncSession = Depends(get_db)):
    items = await crud.create(db, payload)
    await activity_crud.log(
        db,
        action="create",
        entity_type="equipment",
        entity_name=payload.name,
        details={"quantity": payload.quantity, "category": payload.category},
    )
    return items


@router.patch("/group", response_model=list[EquipmentOut])
async def bulk_update_group(
    payload: EquipmentGroupUpdate, db: AsyncSession = Depends(get_db)
):
    """Rename or recategorize all items that share a group name."""
    items = await crud.get_by_name(db, payload.current_name)
    if not items:
        raise HTTPException(status_code=404, detail="No equipment found with that name")
    updated = await crud.bulk_update(db, payload.current_name, payload)
    await activity_crud.log(
        db, action="bulk_update", entity_type="equipment",
        entity_name=payload.current_name,
        details={"new_name": payload.new_name, "new_category": payload.new_category, "count": len(updated)},
    )
    return updated


@router.delete("/group/{name}", status_code=200)
async def delete_group(name: str, db: AsyncSession = Depends(get_db)):
    """Delete all Available equipment units with this name. Returns count deleted."""
    deleted_count = await crud.delete_by_name(db, name)
    if deleted_count == 0:
        raise HTTPException(status_code=400, detail="No available units found to delete")
    await activity_crud.log(
        db, action="bulk_delete", entity_type="equipment",
        entity_name=name, details={"deleted_count": deleted_count},
    )
    return {"deleted": deleted_count}


@router.get("/{equipment_id}", response_model=EquipmentOut)
async def get_equipment(equipment_id: int, db: AsyncSession = Depends(get_db)):
    equipment = await crud.get_by_id(db, equipment_id)
    if not equipment:
        raise HTTPException(status_code=404, detail="Equipment not found")
    return equipment


@router.patch("/{equipment_id}", response_model=EquipmentOut)
async def update_equipment(
    equipment_id: int, payload: EquipmentUpdate, db: AsyncSession = Depends(get_db)
):
    equipment = await crud.get_by_id(db, equipment_id)
    if not equipment:
        raise HTTPException(status_code=404, detail="Equipment not found")

    # State-machine guards: 'Out' is owned by the checkout/check-in workflow
    if payload.status is not None and payload.status != equipment.status:
        if equipment.status.value == "Out":
            raise HTTPException(
                status_code=400,
                detail="This unit is on loan — process the check-in before changing its status",
            )
        if payload.status.value == "Out":
            raise HTTPException(
                status_code=400,
                detail="Units go 'Out' only through the checkout workflow",
            )
        await activity_crud.log(db, action="status_change", entity_type="equipment",
                                entity_id=equipment.id, entity_name=equipment.name,
                                details={"from": equipment.status.value, "to": payload.status.value})

    return await crud.update(db, equipment, payload)


@router.delete("/{equipment_id}", status_code=204)
async def delete_equipment(equipment_id: int, db: AsyncSession = Depends(get_db)):
    equipment = await crud.get_by_id(db, equipment_id)
    if not equipment:
        raise HTTPException(status_code=404, detail="Equipment not found")
    name = equipment.name
    entity_id = equipment.id
    await crud.delete(db, equipment)
    await activity_crud.log(
        db,
        action="delete",
        entity_type="equipment",
        entity_id=entity_id,
        entity_name=name,
    )
