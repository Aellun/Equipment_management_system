from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_db, require_staff
from app.crud import transaction as crud
from app.crud import activity as activity_crud
from app.schemas.transaction import CheckoutPayload, BulkCheckoutPayload, TransactionOut
from app.schemas.audit_log import CheckinPayload, AuditLogOut

router = APIRouter(prefix="/transactions", tags=["Transactions"], dependencies=[Depends(require_staff)])


@router.get("/", response_model=list[TransactionOut])
async def list_transactions(db: AsyncSession = Depends(get_db)):
    return await crud.get_all(db)


@router.post("/checkout", response_model=TransactionOut, status_code=201)
async def checkout(payload: CheckoutPayload, db: AsyncSession = Depends(get_db)):
    transaction = await crud.checkout(db, payload)
    await activity_crud.log(
        db,
        action="checkout",
        entity_type="transaction",
        entity_id=transaction.id,
        details={
            "equipment_id": payload.equipment_id,
            "client_id": payload.client_id,
        },
    )
    return transaction


@router.post("/checkout/bulk", response_model=list[TransactionOut], status_code=201)
async def bulk_checkout(payload: BulkCheckoutPayload, db: AsyncSession = Depends(get_db)):
    transactions = await crud.bulk_checkout(db, payload)
    await activity_crud.log(
        db,
        action="bulk_checkout",
        entity_type="transaction",
        details={
            "equipment_ids": payload.equipment_ids,
            "client_id": payload.client_id,
            "count": len(transactions),
        },
    )
    return transactions


@router.patch("/checkin/{transaction_id}", response_model=AuditLogOut)
async def checkin(transaction_id: int, payload: CheckinPayload, db: AsyncSession = Depends(get_db)):
    audit = await crud.checkin(db, transaction_id, payload)
    await activity_crud.log(
        db,
        action="checkin",
        entity_type="transaction",
        entity_id=transaction_id,
        details={
            "condition_on_return": payload.condition_on_return.value,
            "notes": payload.notes,
        },
    )
    return audit
