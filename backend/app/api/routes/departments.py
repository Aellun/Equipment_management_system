from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_db
from app.crud import department as crud
from app.crud import activity as activity_crud
from app.schemas.department import (
    DepartmentCreate, DepartmentUpdate, DepartmentOut, StoreSettingUpdate,
)

router = APIRouter(prefix="/departments", tags=["Departments"])


@router.get("/", response_model=list[DepartmentOut])
async def list_departments(db: AsyncSession = Depends(get_db)):
    return await crud.get_all(db)


@router.post("/", response_model=DepartmentOut, status_code=201)
async def create_department(payload: DepartmentCreate, db: AsyncSession = Depends(get_db)):
    dept = await crud.create(db, payload)
    await activity_crud.log(db, action="create", entity_type="department",
                            entity_id=dept.id, entity_name=dept.name)
    return dept


@router.patch("/{dept_id}", response_model=DepartmentOut)
async def update_department(dept_id: int, payload: DepartmentUpdate, db: AsyncSession = Depends(get_db)):
    dept = await crud.get_by_id(db, dept_id)
    if not dept:
        raise HTTPException(status_code=404, detail="Department not found")
    return await crud.update(db, dept, payload)


@router.delete("/{dept_id}", status_code=204)
async def delete_department(dept_id: int, db: AsyncSession = Depends(get_db)):
    dept = await crud.get_by_id(db, dept_id)
    if not dept:
        raise HTTPException(status_code=404, detail="Department not found")
    await crud.delete(db, dept)


# ---- Store settings ----
@router.get("/settings/all")
async def get_settings(db: AsyncSession = Depends(get_db)):
    return await crud.get_settings(db)


@router.put("/settings")
async def set_setting(payload: StoreSettingUpdate, db: AsyncSession = Depends(get_db)):
    await crud.set_setting(db, payload.key, payload.value)
    return {"ok": True}
