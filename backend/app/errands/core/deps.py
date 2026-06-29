from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session

from app.errands.core.db import get_db
from app.errands.core.security import decode_token
from app.errands.models.user import User, UserRole

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="api/errands/auth/token", auto_error=False)


def get_current_user(
    token: str | None = Depends(oauth2_scheme),
    db: Session = Depends(get_db),
) -> User:
    cred_error = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    if not token:
        raise cred_error
    payload = decode_token(token)
    if not payload or "sub" not in payload:
        raise cred_error
    user = db.get(User, int(payload["sub"]))
    if not user or not user.is_active:
        raise cred_error
    return user


def require_role(*roles: UserRole):
    def checker(user: User = Depends(get_current_user)) -> User:
        if user.role not in roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Insufficient permissions",
            )
        return user

    return checker
