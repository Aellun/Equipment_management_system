import json
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc
from app.models.activity_log import ActivityLog


async def log(
    db: AsyncSession,
    action: str,
    entity_type: str,
    entity_id: int | None = None,
    entity_name: str | None = None,
    performed_by: str | None = None,
    details: dict | None = None,
) -> None:
    entry = ActivityLog(
        action=action,
        entity_type=entity_type,
        entity_id=entity_id,
        entity_name=entity_name,
        performed_by=performed_by,
        details=json.dumps(details) if details else None,
    )
    db.add(entry)
    # no commit — caller commits (or call separately)
    await db.commit()


async def get_recent(db: AsyncSession, limit: int = 200) -> list[ActivityLog]:
    result = await db.execute(
        select(ActivityLog).order_by(desc(ActivityLog.timestamp)).limit(limit)
    )
    return list(result.scalars().all())
