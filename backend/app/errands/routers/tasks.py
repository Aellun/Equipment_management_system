import secrets

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import desc, select
from sqlalchemy.orm import Session

from app.errands.core.db import get_db
from app.errands.core.deps import get_current_user
from app.errands.core.tasks import notify
from app.errands.models.payment import EscrowStatus
from app.errands.models.review import Review
from app.errands.models.service import ServiceType
from app.errands.models.task import Task, TaskStatus
from app.errands.models.user import User, UserRole
from app.errands.schemas.task import BookingRequest, ReviewCreate, TaskOut
from app.errands.services.pricing import calculate_quote
from app.errands.services.serializers import task_to_out

router = APIRouter(prefix="/errands/tasks", tags=["errands:tasks"])


def _make_reference() -> str:
    return "MME-" + secrets.token_hex(3).upper()


def _get_owned_task(db: Session, task_id: int, user: User) -> Task:
    task = db.get(Task, task_id)
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    if user.role == UserRole.admin:
        return task
    if user.role == UserRole.customer and task.customer_id == user.id:
        return task
    if user.role == UserRole.runner and task.runner_id == user.id:
        return task
    raise HTTPException(status_code=403, detail="Not your task")


@router.post("", response_model=TaskOut, status_code=201)
def create_task(
    body: BookingRequest,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Create a task in `quoted` state with a locked-in transparent price."""
    if user.role != UserRole.customer:
        raise HTTPException(status_code=403, detail="Only customers can book errands")

    service = db.get(ServiceType, body.service_type_id)
    if not service or not service.is_active:
        raise HTTPException(status_code=400, detail="Service not available")

    q = calculate_quote(service, body.distance_km, body.urgency)
    task = Task(
        reference=_make_reference(),
        customer_id=user.id,
        service_type_id=service.id,
        pickup_location=body.pickup_location,
        dropoff_location=body.dropoff_location,
        contact_phone=body.phone or user.phone or "",
        distance_km=body.distance_km,
        urgency=body.urgency,
        notes=body.notes,
        base_price=q.base_price,
        distance_fee=q.distance_fee,
        urgency_fee=q.urgency_fee,
        service_fee=q.service_fee,
        total_price=q.total_price,
        status=TaskStatus.quoted,
    )
    db.add(task)
    db.commit()
    db.refresh(task)
    return task_to_out(db, task, user)


@router.get("/mine", response_model=list[TaskOut])
def my_tasks(
    user: User = Depends(get_current_user), db: Session = Depends(get_db)
):
    if user.role == UserRole.runner:
        stmt = select(Task).where(Task.runner_id == user.id)
    elif user.role == UserRole.admin:
        stmt = select(Task)
    else:
        stmt = select(Task).where(Task.customer_id == user.id)
    tasks = db.scalars(stmt.order_by(desc(Task.created_at))).all()
    return [task_to_out(db, t, user) for t in tasks]


@router.get("/{task_id}", response_model=TaskOut)
def get_task(
    task_id: int,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return task_to_out(db, _get_owned_task(db, task_id, user), user)


@router.get("/ref/{reference}", response_model=TaskOut)
def track_by_reference(reference: str, db: Session = Depends(get_db)):
    """Public tracking by reference — no login needed (like a parcel tracker)."""
    task = db.scalar(select(Task).where(Task.reference == reference.upper()))
    if not task:
        raise HTTPException(status_code=404, detail="Reference not found")
    return task_to_out(db, task)


# ── Runner actions ──────────────────────────────────────────

@router.post("/{task_id}/start", response_model=TaskOut)
def start_task(
    task_id: int,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    task = _get_owned_task(db, task_id, user)
    if user.role != UserRole.runner or task.runner_id != user.id:
        raise HTTPException(status_code=403, detail="Only the assigned runner can start")
    if task.status != TaskStatus.assigned:
        raise HTTPException(status_code=400, detail="Task is not in assigned state")
    task.status = TaskStatus.in_progress
    db.commit()
    db.refresh(task)
    notify("sms", "customer", f"Your errand {task.reference} is in progress")
    return task_to_out(db, task, user)


# ── Customer actions ────────────────────────────────────────

@router.post("/{task_id}/accept", response_model=TaskOut)
def accept_proof(
    task_id: int,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Customer accepts the proof → escrow released, task completed."""
    task = _get_owned_task(db, task_id, user)
    if user.role != UserRole.customer or task.customer_id != user.id:
        raise HTTPException(status_code=403, detail="Only the customer can accept")
    if task.status != TaskStatus.proof_submitted:
        raise HTTPException(status_code=400, detail="No proof to accept yet")

    task.status = TaskStatus.completed
    if task.payment and task.payment.escrow_status == EscrowStatus.held:
        task.payment.escrow_status = EscrowStatus.released
    if task.runner_id:
        runner = db.get(User, task.runner_id)
        if runner and runner.runner_profile:
            runner.runner_profile.completed_tasks += 1
    db.commit()
    db.refresh(task)
    return task_to_out(db, task, user)


@router.post("/{task_id}/dispute", response_model=TaskOut)
def dispute(
    task_id: int,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    task = _get_owned_task(db, task_id, user)
    if user.role != UserRole.customer or task.customer_id != user.id:
        raise HTTPException(status_code=403, detail="Only the customer can dispute")
    if task.status not in (TaskStatus.proof_submitted, TaskStatus.in_progress):
        raise HTTPException(status_code=400, detail="Task cannot be disputed now")
    task.status = TaskStatus.disputed
    db.commit()
    db.refresh(task)
    notify("email", "admin", f"Dispute raised on {task.reference}")
    return task_to_out(db, task, user)


@router.post("/{task_id}/cancel", response_model=TaskOut)
def cancel(
    task_id: int,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    task = _get_owned_task(db, task_id, user)
    if user.role not in (UserRole.customer, UserRole.admin):
        raise HTTPException(status_code=403, detail="Cannot cancel")
    if task.status in (TaskStatus.completed, TaskStatus.cancelled):
        raise HTTPException(status_code=400, detail="Task already closed")
    # Refund if money was held.
    if task.payment and task.payment.escrow_status in (
        EscrowStatus.held,
        EscrowStatus.pending,
    ):
        task.payment.escrow_status = EscrowStatus.refunded
    task.status = TaskStatus.cancelled
    db.commit()
    db.refresh(task)
    return task_to_out(db, task, user)


@router.post("/{task_id}/review", response_model=TaskOut)
def review(
    task_id: int,
    body: ReviewCreate,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    task = _get_owned_task(db, task_id, user)
    if user.role != UserRole.customer or task.customer_id != user.id:
        raise HTTPException(status_code=403, detail="Only the customer can review")
    if task.status != TaskStatus.completed:
        raise HTTPException(status_code=400, detail="Can only review completed tasks")
    if task.review:
        raise HTTPException(status_code=400, detail="Already reviewed")
    if not task.runner_id:
        raise HTTPException(status_code=400, detail="No runner to review")

    rv = Review(
        task_id=task.id,
        runner_id=task.runner_id,
        customer_id=user.id,
        rating=body.rating,
        comment=body.comment,
    )
    db.add(rv)

    # Recompute running average on the runner profile.
    runner = db.get(User, task.runner_id)
    if runner and runner.runner_profile:
        prof = runner.runner_profile
        total = prof.rating_avg * prof.rating_count + body.rating
        prof.rating_count += 1
        prof.rating_avg = round(total / prof.rating_count, 2)
    db.commit()
    db.refresh(task)
    return task_to_out(db, task, user)
