from sqlalchemy import select
from sqlalchemy.orm import Session

from app.errands.models.settings import AppSetting


def get_settings(db: Session) -> AppSetting:
    """Return the singleton settings row, creating it (auto-assign on) if absent."""
    s = db.scalar(select(AppSetting).where(AppSetting.id == 1))
    if not s:
        s = AppSetting(id=1, auto_assign=True)
        db.add(s)
        db.commit()
        db.refresh(s)
    return s


def set_auto_assign(db: Session, enabled: bool) -> AppSetting:
    s = get_settings(db)
    s.auto_assign = enabled
    db.commit()
    db.refresh(s)
    return s
