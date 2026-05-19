from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, EmailStr
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_db
from app.crud import user as crud
from app.schemas.user import UserOut

router = APIRouter(prefix="/auth", tags=["Auth"])


class LoginPayload(BaseModel):
    email: EmailStr
    password: str


@router.post("/login", response_model=UserOut)
async def login(payload: LoginPayload, db: AsyncSession = Depends(get_db)):
    user = await crud.get_by_email(db, payload.email)
    if not user or not crud.verify_password(payload.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    return user