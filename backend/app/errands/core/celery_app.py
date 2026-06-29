from celery import Celery

from app.errands.core.config import settings

celery = Celery(
    "moma_errands",
    broker=settings.REDIS_URL,
    backend=settings.REDIS_URL,
)

celery.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="Africa/Nairobi",
    enable_utc=True,
)

# Import tasks so the worker registers them.
from app.errands.core import tasks  # noqa: E402,F401
