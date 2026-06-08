from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_db
from app.crud import cart as crud
from app.schemas.cart import CartInit, CartItemCreate, CartItemUpdate, CartOut

router = APIRouter(prefix="/cart", tags=["Cart"])


@router.post("/", response_model=CartOut)
async def get_or_create_cart(payload: CartInit, db: AsyncSession = Depends(get_db)):
    cart = await crud.get_or_create(db, payload.session_token, payload.customer_id)
    return crud.serialize(cart)


@router.post("/items", response_model=CartOut)
async def add_item(payload: CartItemCreate, db: AsyncSession = Depends(get_db)):
    cart = await crud.add_item(db, payload)
    return crud.serialize(cart)


@router.patch("/items/{item_id}", response_model=CartOut)
async def update_item(item_id: int, payload: CartItemUpdate, db: AsyncSession = Depends(get_db)):
    cart = await crud.update_item(db, item_id, payload)
    return crud.serialize(cart)


@router.delete("/items/{item_id}", response_model=CartOut)
async def remove_item(item_id: int, db: AsyncSession = Depends(get_db)):
    cart = await crud.remove_item(db, item_id)
    return crud.serialize(cart)
