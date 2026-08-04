import os
import secrets

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.errands.core.db import get_db
from app.errands.core.deps import get_current_user, require_role
from app.errands.core.tasks import notify
from app.errands.models.task import Task, TaskStatus
from app.errands.models.user import RunnerProfile, User, UserRole, VerificationStatus
from app.errands.schemas.task import TaskOut
from app.errands.services.app_settings import get_settings
from app.errands.services.assignment import assign_to_runner
from app.errands.services.serializers import task_to_out

router = APIRouter(prefix="/errands/runners", tags=["errands:runners"])

MEDIA_DIR = os.environ.get("ERRANDS_MEDIA_DIR", "/app/errands_media")
ALLOWED_EXT = {".jpg", ".jpeg", ".png", ".webp"}


@router.get("/me/profile")
def my_profile(
    user: User = Depends(require_role(UserRole.runner)),
    db: Session = Depends(get_db),
):
    prof: RunnerProfile | None = user.runner_profile
    if not prof:
        raise HTTPException(status_code=404, detail="No runner profile")
    return {
        "full_name": user.full_name,
        "suburb": prof.suburb,
        "skills": prof.skills,
        "bio": prof.bio,
        "verification_status": prof.verification_status.value,
        "is_available": prof.is_available,
        "rating_avg": prof.rating_avg,
        "rating_count": prof.rating_count,
        "completed_tasks": prof.completed_tasks,
    }


@router.get("/available-tasks", response_model=list[TaskOut])
def available_tasks(
    user: User = Depends(require_role(UserRole.runner)),
    db: Session = Depends(get_db),
):
    """Open pool of unassigned, paid tasks.

    Visible to runners only when auto-assign is ON. In manual mode this returns
    an empty list — runners then see only tasks assigned to them.
    """
    if not get_settings(db).auto_assign:
        return []
    tasks = db.scalars(
        select(Task)
        .where(Task.runner_id.is_(None), Task.status == TaskStatus.paid)
        .order_by(Task.created_at)
    ).all()
    return [task_to_out(db, t) for t in tasks]


@router.post("/tasks/{task_id}/claim", response_model=TaskOut)
def claim_task(
    task_id: int,
    user: User = Depends(require_role(UserRole.runner)),
    db: Session = Depends(get_db),
):
    """Runner self-claims an open task from the pool (auto-assign mode only)."""
    if not get_settings(db).auto_assign:
        raise HTTPException(status_code=403, detail="Self-claim is disabled in manual mode")
    prof: RunnerProfile | None = user.runner_profile
    if not prof or prof.verification_status != VerificationStatus.verified:
        raise HTTPException(status_code=403, detail="Only verified runners can claim tasks")
    if not prof.is_available:
        raise HTTPException(status_code=400, detail="Set yourself available to claim tasks")

    task = db.get(Task, task_id)
    if not task or task.status != TaskStatus.paid or task.runner_id is not None:
        raise HTTPException(status_code=400, detail="Task is no longer available")

    assign_to_runner(db, task, user)
    return task_to_out(db, task, user)


@router.post("/me/availability")
def set_availability(
    available: bool,
    user: User = Depends(require_role(UserRole.runner)),
    db: Session = Depends(get_db),
):
    user.runner_profile.is_available = available
    db.commit()
    return {"is_available": available}


@router.post("/tasks/{task_id}/proof", response_model=TaskOut)
def submit_proof(
    task_id: int,
    proof_note: str = Form(""),
    photo: UploadFile = File(...),
    user: User = Depends(require_role(UserRole.runner)),
    db: Session = Depends(get_db),
):
    """Runner uploads a completion photo → task moves to proof_submitted.

    The customer reviews the proof before the job is marked complete.
    """
    task = db.get(Task, task_id)
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    if task.runner_id != user.id:
        raise HTTPException(status_code=403, detail="Not your task")
    if task.status not in (TaskStatus.in_progress, TaskStatus.assigned):
        raise HTTPException(status_code=400, detail="Task not in a state to submit proof")

    ext = os.path.splitext(photo.filename or "")[1].lower()
    if ext not in ALLOWED_EXT:
        raise HTTPException(status_code=400, detail="Only JPG/PNG/WEBP images allowed")

    os.makedirs(MEDIA_DIR, exist_ok=True)
    fname = f"proof_{task.reference}_{secrets.token_hex(4)}{ext}"
    path = os.path.join(MEDIA_DIR, fname)
    with open(path, "wb") as f:
        f.write(photo.file.read())

    task.proof_photo_url = f"/errands-media/{fname}"
    task.proof_note = proof_note
    task.status = TaskStatus.proof_submitted
    db.commit()
    db.refresh(task)
    notify("sms", "customer", f"Proof submitted for {task.reference}. Please review.")
    return task_to_out(db, task, user)
