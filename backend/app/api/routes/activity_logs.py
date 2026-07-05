from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from app.api.deps import get_db, require_admin
from app.crud import activity as crud
from app.schemas.activity_log import ActivityLogOut

router = APIRouter(prefix="/activity-logs", tags=["Activity Logs"], dependencies=[Depends(require_admin)])


@router.get("/", response_model=list[ActivityLogOut])
async def list_activity_logs(
    limit: int = Query(default=200, le=500),
    db: AsyncSession = Depends(get_db),
):
    return await crud.get_recent(db, limit)
