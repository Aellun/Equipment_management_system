from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from fastapi import HTTPException

from app.models.transaction import Transaction
from app.models.equipment import Equipment, EquipmentStatus
from app.models.audit_log import AuditLog, ConditionOnReturn
from app.schemas.transaction import CheckoutPayload, BulkCheckoutPayload
from app.schemas.audit_log import CheckinPayload


async def get_all(db: AsyncSession) -> list[Transaction]:
    result = await db.execute(
        select(Transaction).options(
            selectinload(Transaction.equipment),
            selectinload(Transaction.client),
            selectinload(Transaction.audit_log),
        )
    )
    return list(result.scalars().all())


async def get_client_history(db: AsyncSession, client_id: int) -> list[Transaction]:
    result = await db.execute(
        select(Transaction)
        .options(selectinload(Transaction.equipment), selectinload(Transaction.audit_log))
        .where(Transaction.client_id == client_id)
    )
    return list(result.scalars().all())


async def checkout(db: AsyncSession, payload: CheckoutPayload) -> Transaction:
    result = await db.execute(select(Equipment).where(Equipment.id == payload.equipment_id))
    equipment = result.scalar_one_or_none()

    if not equipment:
        raise HTTPException(status_code=404, detail="Equipment not found")
    if equipment.status != EquipmentStatus.available:
        raise HTTPException(
            status_code=400,
            detail=f"Equipment is not available. Current status: {equipment.status.value}",
        )

    transaction = Transaction(
        equipment_id=payload.equipment_id,
        client_id=payload.client_id,
        due_date=payload.due_date,
        staff_out_id=payload.staff_out_id,
    )
    equipment.status = EquipmentStatus.out
    db.add(transaction)
    await db.commit()
    await db.refresh(transaction)
    return transaction


async def bulk_checkout(db: AsyncSession, payload: BulkCheckoutPayload) -> list[Transaction]:
    result = await db.execute(
        select(Equipment).where(Equipment.id.in_(payload.equipment_ids))
    )
    items = list(result.scalars().all())

    found_ids = {e.id for e in items}
    missing = set(payload.equipment_ids) - found_ids
    if missing:
        raise HTTPException(status_code=404, detail=f"Equipment not found: {sorted(missing)}")

    unavailable = [e for e in items if e.status != EquipmentStatus.available]
    if unavailable:
        names = ", ".join(e.name for e in unavailable)
        raise HTTPException(status_code=400, detail=f"Not available: {names}")

    tx_ids = []
    for equipment in items:
        tx = Transaction(
            equipment_id=equipment.id,
            client_id=payload.client_id,
            due_date=payload.due_date,
            staff_out_id=payload.staff_out_id,
        )
        equipment.status = EquipmentStatus.out
        db.add(tx)
        await db.flush()
        tx_ids.append(tx.id)

    await db.commit()

    fetched = await db.execute(
        select(Transaction)
        .options(
            selectinload(Transaction.equipment),
            selectinload(Transaction.client),
            selectinload(Transaction.audit_log),
        )
        .where(Transaction.id.in_(tx_ids))
    )
    return list(fetched.scalars().all())


async def checkin(db: AsyncSession, transaction_id: int, payload: CheckinPayload) -> AuditLog:
    result = await db.execute(
        select(Transaction)
        .options(selectinload(Transaction.equipment), selectinload(Transaction.audit_log))
        .where(Transaction.id == transaction_id)
    )
    transaction = result.scalar_one_or_none()

    if not transaction:
        raise HTTPException(status_code=404, detail="Transaction not found")
    if transaction.audit_log is not None:
        raise HTTPException(status_code=400, detail="Equipment already checked in for this transaction")

    if payload.condition_on_return in (ConditionOnReturn.damaged, ConditionOnReturn.needs_repair):
        transaction.equipment.status = EquipmentStatus.maintenance
    else:
        transaction.equipment.status = EquipmentStatus.available

    audit = AuditLog(
        transaction_id=transaction_id,
        condition_on_return=payload.condition_on_return,
        notes=payload.notes,
    )
    db.add(audit)
    await db.commit()
    await db.refresh(audit)
    return audit
