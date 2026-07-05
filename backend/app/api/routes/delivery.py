from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_db, require_staff
from app.crud import delivery as crud
from app.schemas.delivery import DeliveryZoneCreate, DeliveryZoneUpdate, DeliveryZoneOut

router = APIRouter(prefix="/delivery-zones", tags=["Delivery"], dependencies=[Depends(require_staff)])


@router.get("/", response_model=list[DeliveryZoneOut])
async def list_zones(active_only: bool = False, db: AsyncSession = Depends(get_db)):
    return await crud.get_all(db, active_only=active_only)


@router.post("/", response_model=DeliveryZoneOut, status_code=201)
async def create_zone(payload: DeliveryZoneCreate, db: AsyncSession = Depends(get_db)):
    return await crud.create(db, payload)


@router.patch("/{zone_id}", response_model=DeliveryZoneOut)
async def update_zone(zone_id: int, payload: DeliveryZoneUpdate, db: AsyncSession = Depends(get_db)):
    zone = await crud.get_by_id(db, zone_id)
    if not zone:
        raise HTTPException(status_code=404, detail="Zone not found")
    return await crud.update(db, zone, payload)


@router.delete("/{zone_id}", status_code=204)
async def delete_zone(zone_id: int, db: AsyncSession = Depends(get_db)):
    zone = await crud.get_by_id(db, zone_id)
    if not zone:
        raise HTTPException(status_code=404, detail="Zone not found")
    await crud.delete(db, zone)
