from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.errands.core.config import settings
from app.errands.core.db import get_db
from app.errands.core.deps import get_current_user
from app.errands.core.tasks import notify
from app.errands.models.payment import EscrowStatus, Payment
from app.errands.models.task import Task, TaskStatus
from app.errands.models.user import User, UserRole
from app.errands.schemas.task import TaskOut
from app.errands.services import mpesa
from app.errands.services.app_settings import get_settings
from app.errands.services.assignment import assign_task
from app.errands.services.serializers import task_to_out

router = APIRouter(prefix="/errands/payments", tags=["errands:payments"])


@router.post("/tasks/{task_id}/pay", response_model=dict)
def pay_task(
    task_id: int,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Trigger STK push to fund escrow for a quoted task."""
    task = db.get(Task, task_id)
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    if task.customer_id != user.id:
        raise HTTPException(status_code=403, detail="Not your task")
    if task.status != TaskStatus.quoted:
        raise HTTPException(status_code=400, detail="Task is not awaiting payment")

    phone = user.phone
    result = mpesa.stk_push(
        phone=phone,
        amount=task.total_price,
        reference=task.reference,
        description=f"{task.service_type.name}",
    )

    payment = task.payment or Payment(task_id=task.id, amount=task.total_price, phone=phone)
    payment.checkout_request_id = result["checkout_request_id"]
    payment.merchant_request_id = result["merchant_request_id"]
    payment.escrow_status = EscrowStatus.pending
    db.add(payment)
    db.commit()

    return {
        "checkout_request_id": result["checkout_request_id"],
        "customer_message": result["customer_message"],
        "mock": result.get("mock", False),
        "task_id": task.id,
    }


@router.post("/mpesa/callback")
async def mpesa_callback(request: Request, db: Session = Depends(get_db)):
    """Daraja calls this on payment result. Funds escrow + auto-assigns runner."""
    body = await request.json()
    parsed = mpesa.parse_callback(body)
    _settle(db, parsed["checkout_request_id"], parsed["success"], parsed.get("mpesa_receipt"))
    # Daraja expects this exact ack shape.
    return {"ResultCode": 0, "ResultDesc": "Accepted"}


@router.post("/mpesa/simulate", response_model=TaskOut)
def simulate_callback(
    checkout_request_id: str,
    success: bool = True,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Demo/dev helper: simulate the M-Pesa callback when MPESA_MOCK is on."""
    if not settings.MPESA_MOCK:
        raise HTTPException(status_code=400, detail="Simulation only allowed in mock mode")
    task = _settle(db, checkout_request_id, success, mpesa_receipt="MOCKRCPT123")
    if not task:
        raise HTTPException(status_code=404, detail="No payment for that checkout id")
    return task_to_out(db, task, user)


def _settle(db: Session, checkout_id: str | None, success: bool, mpesa_receipt: str | None) -> Task | None:
    if not checkout_id:
        return None
    payment = db.scalar(
        select(Payment).where(Payment.checkout_request_id == checkout_id)
    )
    if not payment:
        return None
    task = db.get(Task, payment.task_id)

    if not success:
        payment.escrow_status = EscrowStatus.failed
        db.commit()
        return task

    payment.escrow_status = EscrowStatus.held
    payment.mpesa_receipt = mpesa_receipt
    if task and task.status == TaskStatus.quoted:
        task.status = TaskStatus.paid
    db.commit()

    # Assign a runner now that escrow is funded — only in auto mode.
    if task:
        if get_settings(db).auto_assign:
            runner = assign_task(db, task)
            if runner:
                notify("sms", runner.phone, f"New errand assigned: {task.reference}")
            else:
                notify("email", "ops", f"No runner available for {task.reference}")
        else:
            notify("email", "ops", f"{task.reference} paid — awaiting manual assignment")
        db.refresh(task)
    return task
