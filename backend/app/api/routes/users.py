from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_db
from app.crud import user as crud
from app.crud import activity as activity_crud
from app.schemas.user import UserCreate, UserUpdate, UserOut

router = APIRouter(prefix="/users", tags=["Users"])


@router.get("/", response_model=list[UserOut])
async def list_users(db: AsyncSession = Depends(get_db)):
    return await crud.get_all(db)


@router.post("/", response_model=UserOut, status_code=201)
async def create_user(payload: UserCreate, db: AsyncSession = Depends(get_db)):
    existing = await crud.get_by_email(db, payload.email)
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    user = await crud.create(db, payload)
    await activity_crud.log(
        db,
        action="create",
        entity_type="user",
        entity_id=user.id,
        entity_name=user.name,
        details={"email": user.email, "role": user.role.value},
    )
    return user


@router.delete("/{user_id}", status_code=204)
async def delete_user(user_id: int, db: AsyncSession = Depends(get_db)):
    user = await crud.get_by_id(db, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    name = user.name
    email = user.email
    await crud.delete(db, user)
    await activity_crud.log(
        db,
        action="delete",
        entity_type="user",
        entity_id=user_id,
        entity_name=name,
        details={"email": email},
    )
