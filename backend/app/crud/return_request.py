from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from fastapi import HTTPException

from app.models.return_request import ReturnRequest
from app.models.order import Order
from app.schemas.return_request import ReturnCreate, ReturnUpdate


async def create(db: AsyncSession, payload: ReturnCreate) -> ReturnRequest:
    order = (await db.execute(
        select(Order).where(Order.order_number == payload.order_number.strip().upper())
    )).scalar_one_or_none()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found. Check your order code.")
    if order.contact_email.lower() != payload.contact_email.strip().lower():
        raise HTTPException(status_code=400, detail="Email does not match this order.")

    req = ReturnRequest(
        order_id=order.id,
        reason=payload.reason,
        details=payload.details,
        contact_email=payload.contact_email.strip(),
    )
    db.add(req)
    await db.commit()
    await db.refresh(req)
    return req


async def get_all(db: AsyncSession) -> list[ReturnRequest]:
    result = await db.execute(
        select(ReturnRequest).order_by(ReturnRequest.created_at.desc())
    )
    return list(result.scalars().all())


async def get_by_id(db: AsyncSession, return_id: int) -> ReturnRequest | None:
    result = await db.execute(select(ReturnRequest).where(ReturnRequest.id == return_id))
    return result.scalar_one_or_none()


async def update(db: AsyncSession, req: ReturnRequest, payload: ReturnUpdate) -> ReturnRequest:
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(req, field, value)
    await db.commit()
    await db.refresh(req)
    return req
