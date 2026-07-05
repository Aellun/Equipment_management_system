from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_db, require_staff
from app.crud import shop_category as crud
from app.crud import activity as activity_crud
from app.schemas.shop_category import ShopCategoryCreate, ShopCategoryUpdate, ShopCategoryOut

router = APIRouter(prefix="/shop-categories", tags=["Shop Categories"], dependencies=[Depends(require_staff)])


@router.get("/", response_model=list[ShopCategoryOut])
async def list_categories(db: AsyncSession = Depends(get_db)):
    return await crud.get_all(db)


@router.post("/", response_model=ShopCategoryOut, status_code=201)
async def create_category(payload: ShopCategoryCreate, db: AsyncSession = Depends(get_db)):
    category = await crud.create(db, payload)
    await activity_crud.log(db, action="create", entity_type="shop_category",
                            entity_id=category.id, entity_name=category.name)
    return category


@router.patch("/{category_id}", response_model=ShopCategoryOut)
async def update_category(category_id: int, payload: ShopCategoryUpdate, db: AsyncSession = Depends(get_db)):
    category = await crud.get_by_id(db, category_id)
    if not category:
        raise HTTPException(status_code=404, detail="Category not found")
    return await crud.update(db, category, payload)


@router.delete("/{category_id}", status_code=204)
async def delete_category(category_id: int, db: AsyncSession = Depends(get_db)):
    category = await crud.get_by_id(db, category_id)
    if not category:
        raise HTTPException(status_code=404, detail="Category not found")
    name = category.name
    await crud.delete(db, category)
    await activity_crud.log(db, action="delete", entity_type="shop_category",
                            entity_id=category_id, entity_name=name)
