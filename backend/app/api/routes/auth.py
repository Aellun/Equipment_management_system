from fastapi import APIRouter, Depends, HTTPException, Request, Response, status
from pydantic import BaseModel, EmailStr
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_staff, get_db
from app.config import settings
from app.crud import user as crud
from app.models.user import User
from app.schemas.user import UserOut
from app.security import (
    REFRESH_TYPE,
    create_access_token,
    create_refresh_token,
    decode_token,
)

router = APIRouter(prefix="/auth", tags=["Auth"])


class LoginPayload(BaseModel):
    email: EmailStr
    password: str


def _set_auth_cookies(response: Response, user: User) -> None:
    access = create_access_token(user.id, user.role.value)
    refresh = create_refresh_token(user.id, user.role.value)
    common = {
        "httponly": True,
        "secure": settings.cookie_secure,
        "samesite": "lax",
        "path": "/",
    }
    response.set_cookie(
        settings.access_cookie_name, access,
        max_age=settings.access_token_expire_minutes * 60, **common,
    )
    response.set_cookie(
        settings.refresh_cookie_name, refresh,
        max_age=settings.refresh_token_expire_days * 86400, **common,
    )


@router.post("/login", response_model=UserOut)
async def login(payload: LoginPayload, response: Response, db: AsyncSession = Depends(get_db)):
    user = await crud.get_by_email(db, payload.email)
    if not user or not crud.verify_password(payload.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    _set_auth_cookies(response, user)
    return user


@router.post("/refresh", response_model=UserOut)
async def refresh(request: Request, response: Response, db: AsyncSession = Depends(get_db)):
    """Rotate a short-lived access token using the refresh cookie."""
    token = request.cookies.get(settings.refresh_cookie_name)
    if not token:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="No refresh token")
    data = decode_token(token, REFRESH_TYPE)
    if not data:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid refresh token")
    user = await crud.get_by_id(db, int(data["sub"]))
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User no longer exists")
    _set_auth_cookies(response, user)
    return user


@router.get("/me", response_model=UserOut)
async def me(user: User = Depends(get_current_staff)):
    return user


@router.post("/logout", status_code=204)
async def logout(response: Response):
    response.delete_cookie(settings.access_cookie_name, path="/")
    response.delete_cookie(settings.refresh_cookie_name, path="/")
