from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_db, require_staff
from app.crud import order as crud
from app.crud import activity as activity_crud
from app.schemas.order import CheckoutPayload, OrderUpdate, OrderOut, OrderTrackingOut

router = APIRouter(prefix="/orders", tags=["Orders"])


@router.get("/", response_model=list[OrderOut], dependencies=[Depends(require_staff)])
async def list_orders(customer_id: int | None = None, db: AsyncSession = Depends(get_db)):
    if customer_id is not None:
        return await crud.get_for_customer(db, customer_id)
    return await crud.get_all(db)


@router.post("/checkout", response_model=OrderOut, status_code=201)
async def checkout(payload: CheckoutPayload, db: AsyncSession = Depends(get_db)):
    order = await crud.checkout(db, payload)
    await activity_crud.log(db, action="checkout", entity_type="order",
                            entity_id=order.id, entity_name=order.order_number,
                            details={"total": str(order.total), "items": len(order.items)})
    return order


@router.get("/track/{order_number}", response_model=OrderTrackingOut)
async def track_order(order_number: str, db: AsyncSession = Depends(get_db)):
    """Public order tracking by code — no login required (privacy-safe view)."""
    order = await crud.get_by_number(db, order_number)
    if not order:
        raise HTTPException(status_code=404, detail="No order found with that code. Please check and try again.")
    return order


@router.get("/{order_id}", response_model=OrderOut)
async def get_order(order_id: int, db: AsyncSession = Depends(get_db)):
    order = await crud.get_by_id(db, order_id)
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    return order


@router.patch("/{order_id}", response_model=OrderOut, dependencies=[Depends(require_staff)])
async def update_order(order_id: int, payload: OrderUpdate, db: AsyncSession = Depends(get_db)):
    order = await crud.get_by_id(db, order_id)
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    updated = await crud.update(db, order, payload)
    await activity_crud.log(db, action="update", entity_type="order",
                            entity_id=order_id, entity_name=updated.order_number,
                            details=payload.model_dump(exclude_unset=True, mode="json"))
    return updated
