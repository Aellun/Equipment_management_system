from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_db, require_staff
from app.crud import return_request as crud
from app.crud import order as order_crud
from app.crud import activity as activity_crud
from app.schemas.return_request import ReturnCreate, ReturnUpdate, ReturnOut

router = APIRouter(prefix="/returns", tags=["Returns"])


def _with_number(req, order_number: str | None) -> ReturnOut:
    out = ReturnOut.model_validate(req)
    out.order_number = order_number
    return out


@router.post("/", response_model=ReturnOut, status_code=201)
async def create_return(payload: ReturnCreate, db: AsyncSession = Depends(get_db)):
    req = await crud.create(db, payload)
    await activity_crud.log(db, action="create", entity_type="return",
                            entity_id=req.id, entity_name=payload.order_number,
                            details={"reason": payload.reason})
    return _with_number(req, payload.order_number.strip().upper())


@router.get("/", response_model=list[ReturnOut], dependencies=[Depends(require_staff)])
async def list_returns(db: AsyncSession = Depends(get_db)):
    reqs = await crud.get_all(db)
    out = []
    for r in reqs:
        order = await order_crud.get_by_id(db, r.order_id)
        out.append(_with_number(r, order.order_number if order else None))
    return out


@router.patch("/{return_id}", response_model=ReturnOut, dependencies=[Depends(require_staff)])
async def update_return(return_id: int, payload: ReturnUpdate, db: AsyncSession = Depends(get_db)):
    req = await crud.get_by_id(db, return_id)
    if not req:
        raise HTTPException(status_code=404, detail="Return request not found")
    updated = await crud.update(db, req, payload)
    order = await order_crud.get_by_id(db, updated.order_id)
    await activity_crud.log(db, action="update", entity_type="return",
                            entity_id=return_id,
                            entity_name=order.order_number if order else None,
                            details=payload.model_dump(exclude_unset=True, mode="json"))
    return _with_number(updated, order.order_number if order else None)
