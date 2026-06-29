"""Platform auto-assignment.

Picks the best available, verified runner for a task. Ranking favours:
  1. availability + verified status (hard filter)
  2. fewer active tasks (load balancing)
  3. higher rating
  4. more completed tasks (experience tie-breaker)
"""
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.errands.models.task import Task, TaskStatus
from app.errands.models.user import RunnerProfile, User, UserRole, VerificationStatus

ACTIVE_STATUSES = (
    TaskStatus.assigned,
    TaskStatus.in_progress,
    TaskStatus.proof_submitted,
)


def _active_load(db: Session, runner_id: int) -> int:
    return (
        db.scalar(
            select(func.count(Task.id)).where(
                Task.runner_id == runner_id,
                Task.status.in_(ACTIVE_STATUSES),
            )
        )
        or 0
    )


def available_runners(db: Session) -> list[User]:
    """Verified, available runners ordered best-first (low load, high rating)."""
    candidates = db.scalars(
        select(User)
        .join(RunnerProfile)
        .where(
            User.role == UserRole.runner,
            User.is_active.is_(True),
            RunnerProfile.is_available.is_(True),
            RunnerProfile.verification_status == VerificationStatus.verified,
        )
    ).all()

    def score(user: User) -> tuple:
        prof = user.runner_profile
        load = _active_load(db, user.id)
        # Lower load first, then higher rating, then more experience.
        return (load, -(prof.rating_avg or 0.0), -(prof.completed_tasks or 0))

    return sorted(candidates, key=score)


def pick_runner(db: Session) -> User | None:
    runners = available_runners(db)
    return runners[0] if runners else None


def assign_to_runner(db: Session, task: Task, runner: User) -> User:
    """Explicitly (re)assign a task to a specific runner.

    Used for admin manual assignment, admin reassignment, and runner self-claim.
    A reassignment resets the task to `assigned` and clears any stale proof so
    the new runner starts fresh.
    """
    task.runner_id = runner.id
    task.status = TaskStatus.assigned
    task.proof_photo_url = None
    task.proof_note = ""
    db.add(task)
    db.commit()
    db.refresh(task)
    return runner


def assign_task(db: Session, task: Task) -> User | None:
    runner = pick_runner(db)
    if runner is None:
        return None
    task.runner_id = runner.id
    task.status = TaskStatus.assigned
    db.add(task)
    db.commit()
    db.refresh(task)
    return runner
