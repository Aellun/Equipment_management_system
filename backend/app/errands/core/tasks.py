"""Async Celery tasks: notifications and deferred work.

Notifications are stubbed (logged) so the WhatsApp / SMS Business API can be
wired in later without touching call sites.
"""
import logging

from app.errands.core.celery_app import celery

logger = logging.getLogger("moma.notifications")


@celery.task
def send_notification(channel: str, recipient: str, message: str) -> None:
    # TODO: integrate WhatsApp Business API / Africa's Talking SMS here.
    logger.info("[notify:%s] -> %s: %s", channel, recipient, message)


def notify(channel: str, recipient: str, message: str) -> None:
    """Fire-and-forget dispatch that never breaks the request.

    Enqueues on Celery when the broker is reachable; otherwise logs inline so
    the API still works without Redis (tests, local-only runs).
    """
    try:
        send_notification.delay(channel, recipient, message)
    except Exception:  # broker down / not configured
        logger.info("[notify:%s:inline] -> %s: %s", channel, recipient, message)
