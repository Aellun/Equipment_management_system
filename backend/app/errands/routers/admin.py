from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.errands.core.db import get_db
from app.errands.core.deps import require_role
from app.errands.core.tasks import notify
from app.errands.models.payment import PaymentStatus
from app.errands.models.service import ServiceType
from app.errands.models.task import Task, TaskStatus
from app.errands.models.user import RunnerProfile, User, UserRole, VerificationStatus
from app.errands.schemas.service import ServiceOut, ServiceUpdate
from app.errands.schemas.task import TaskOut
from app.errands.services.app_settings import get_settings, set_auto_assign
from app.errands.services.assignment import _active_load, assign_to_runner, available_runners
from app.errands.services.serializers import task_to_out

router = APIRouter(
    prefix="/errands/admin",
    tags=["errands:admin"],
    dependencies=[Depends(require_role(UserRole.admin))],
)


@router.get("/stats")
def stats(db: Session = Depends(get_db)):
    by_status = dict(
        db.execute(select(Task.status, func.count(Task.id)).group_by(Task.status)).all()
    )
    gmv = db.scalar(
        select(func.coalesce(func.sum(Task.total_price), 0)).where(
            Task.status == TaskStatus.completed
        )
    )
    return {
        "tasks_by_status": {k.value: v for k, v in by_status.items()},
        "completed_gmv": float(gmv or 0),
        "runners_total": db.scalar(select(func.count(User.id)).where(User.role == UserRole.runner)),
        "runners_pending": db.scalar(
            select(func.count(RunnerProfile.id)).where(
                RunnerProfile.verification_status == VerificationStatus.pending
            )
        ),
        "open_disputes": db.scalar(
            select(func.count(Task.id)).where(Task.status == TaskStatus.disputed)
        ),
    }


# ── Assignment mode toggle ──────────────────────────────────

@router.get("/settings")
def read_settings(db: Session = Depends(get_db)):
    s = get_settings(db)
    return {"auto_assign": s.auto_assign}


@router.post("/settings/auto-assign")
def toggle_auto_assign(enabled: bool, db: Session = Depends(get_db)):
    """ON → paid tasks auto-assign + open pool visible to runners.
    OFF → admin assigns each task; runners only see their own."""
    s = set_auto_assign(db, enabled)
    return {"auto_assign": s.auto_assign}


@router.get("/runners/available")
def runners_available(db: Session = Depends(get_db)):
    """Verified, available runners (best-first) for the assignment picker."""
    return [
        {
            "id": r.id,
            "full_name": r.full_name,
            "suburb": r.runner_profile.suburb if r.runner_profile else None,
            "rating_avg": r.runner_profile.rating_avg if r.runner_profile else 0,
            "active_load": _active_load(db, r.id),
        }
        for r in available_runners(db)
    ]


@router.post("/tasks/{task_id}/assign", response_model=TaskOut)
def assign_or_reassign(
    task_id: int, runner_id: int, db: Session = Depends(get_db)
):
    """Manually assign or reassign a task to a specific runner.

    Works whether the task is unassigned (`paid`) or already with another
    runner who can no longer complete it (`assigned`/`in_progress`/`disputed`).
    """
    task = db.get(Task, task_id)
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    if task.status in (TaskStatus.completed, TaskStatus.cancelled):
        raise HTTPException(status_code=400, detail="Task is already closed")

    runner = db.get(User, runner_id)
    if not runner or runner.role != UserRole.runner or not runner.runner_profile:
        raise HTTPException(status_code=404, detail="Runner not found")
    if runner.runner_profile.verification_status != VerificationStatus.verified:
        raise HTTPException(status_code=400, detail="Runner is not verified")

    previous_runner_id = task.runner_id
    assign_to_runner(db, task, runner)

    notify("sms", runner.phone, f"Errand {task.reference} assigned to you")
    if previous_runner_id and previous_runner_id != runner.id:
        prev = db.get(User, previous_runner_id)
        if prev:
            notify("sms", prev.phone, f"Errand {task.reference} was reassigned")
    return task_to_out(db, task)


@router.get("/tasks", response_model=list[TaskOut])
def all_tasks(status: TaskStatus | None = None, db: Session = Depends(get_db)):
    stmt = select(Task).order_by(Task.created_at.desc())
    if status:
        stmt = stmt.where(Task.status == status)
    return [task_to_out(db, t) for t in db.scalars(stmt).all()]


@router.get("/runners")
def list_runners(db: Session = Depends(get_db)):
    runners = db.scalars(select(User).where(User.role == UserRole.runner)).all()
    out = []
    for r in runners:
        p = r.runner_profile
        out.append(
            {
                "id": r.id,
                "full_name": r.full_name,
                "email": r.email,
                "phone": r.phone,
                "suburb": p.suburb if p else None,
                "skills": p.skills if p else "",
                "verification_status": p.verification_status.value if p else "pending",
                "is_available": p.is_available if p else False,
                "rating_avg": p.rating_avg if p else 0,
                "completed_tasks": p.completed_tasks if p else 0,
            }
        )
    return out


@router.post("/runners/{runner_id}/verify")
def verify_runner(runner_id: int, approve: bool = True, db: Session = Depends(get_db)):
    runner = db.get(User, runner_id)
    if not runner or runner.role != UserRole.runner or not runner.runner_profile:
        raise HTTPException(status_code=404, detail="Runner not found")
    runner.runner_profile.verification_status = (
        VerificationStatus.verified if approve else VerificationStatus.rejected
    )
    db.commit()
    return {"id": runner_id, "verification_status": runner.runner_profile.verification_status.value}


@router.patch("/services/{service_id}", response_model=ServiceOut)
def update_service(service_id: int, body: ServiceUpdate, db: Session = Depends(get_db)):
    service = db.get(ServiceType, service_id)
    if not service:
        raise HTTPException(status_code=404, detail="Service not found")
    for field, value in body.model_dump(exclude_none=True).items():
        setattr(service, field, value)
    db.commit()
    db.refresh(service)
    return service


@router.post("/tasks/{task_id}/resolve", response_model=TaskOut)
def resolve_dispute(
    task_id: int, refund_customer: bool, db: Session = Depends(get_db)
):
    """Resolve a dispute. Payment already sits in the admin M-Pesa account:
    refunding the customer is a manual M-Pesa send, recorded here for the books."""
    task = db.get(Task, task_id)
    if not task or task.status != TaskStatus.disputed:
        raise HTTPException(status_code=404, detail="No open dispute on this task")
    if refund_customer:
        if task.payment and task.payment.payment_status == PaymentStatus.paid:
            task.payment.payment_status = PaymentStatus.refunded
        task.status = TaskStatus.cancelled
    else:
        task.status = TaskStatus.completed
    db.commit()
    db.refresh(task)
    return task_to_out(db, task)
