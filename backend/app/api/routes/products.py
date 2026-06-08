from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_db
from app.crud import product as crud
from app.crud import activity as activity_crud
from app.schemas.product import (
    ProductCreate, ProductUpdate, ProductOut,
    VariantCreate, VariantUpdate, VariantOut, ImageOut,
)

router = APIRouter(prefix="/products", tags=["Products"])


# ---- Admin product management ----
@router.get("/", response_model=list[ProductOut])
async def list_products(db: AsyncSession = Depends(get_db)):
    return await crud.get_all(db)


@router.post("/", response_model=ProductOut, status_code=201)
async def create_product(payload: ProductCreate, db: AsyncSession = Depends(get_db)):
    product = await crud.create(db, payload)
    await activity_crud.log(db, action="create", entity_type="product",
                            entity_id=product.id, entity_name=product.name,
                            details={"variants": len(product.variants)})
    return product


@router.post("/{product_id}/duplicate", response_model=ProductOut, status_code=201)
async def duplicate_product(product_id: int, db: AsyncSession = Depends(get_db)):
    product = await crud.get_by_id(db, product_id)
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    clone = await crud.duplicate(db, product)
    await activity_crud.log(db, action="duplicate", entity_type="product",
                            entity_id=clone.id, entity_name=clone.name)
    return clone


@router.get("/{product_id}", response_model=ProductOut)
async def get_product(product_id: int, db: AsyncSession = Depends(get_db)):
    product = await crud.get_by_id(db, product_id)
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    return product


@router.patch("/{product_id}", response_model=ProductOut)
async def update_product(product_id: int, payload: ProductUpdate, db: AsyncSession = Depends(get_db)):
    product = await crud.get_by_id(db, product_id)
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    return await crud.update(db, product, payload)


@router.delete("/{product_id}", status_code=204)
async def delete_product(product_id: int, db: AsyncSession = Depends(get_db)):
    product = await crud.get_by_id(db, product_id)
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    name = product.name
    await crud.delete(db, product)
    await activity_crud.log(db, action="delete", entity_type="product",
                            entity_id=product_id, entity_name=name)


# ---- Variants ----
@router.post("/{product_id}/variants", response_model=VariantOut, status_code=201)
async def add_variant(product_id: int, payload: VariantCreate, db: AsyncSession = Depends(get_db)):
    product = await crud.get_by_id(db, product_id)
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    return await crud.add_variant(db, product, payload)


@router.patch("/variants/{variant_id}", response_model=VariantOut)
async def update_variant(variant_id: int, payload: VariantUpdate, db: AsyncSession = Depends(get_db)):
    variant = await crud.get_variant(db, variant_id)
    if not variant:
        raise HTTPException(status_code=404, detail="Variant not found")
    return await crud.update_variant(db, variant, payload)


@router.delete("/variants/{variant_id}", status_code=204)
async def delete_variant(variant_id: int, db: AsyncSession = Depends(get_db)):
    variant = await crud.get_variant(db, variant_id)
    if not variant:
        raise HTTPException(status_code=404, detail="Variant not found")
    await crud.delete_variant(db, variant)


# ---- Images ----
@router.post("/{product_id}/images", response_model=ImageOut, status_code=201)
async def add_image(product_id: int, url: str, db: AsyncSession = Depends(get_db)):
    product = await crud.get_by_id(db, product_id)
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    return await crud.add_image(db, product, url)


@router.delete("/images/{image_id}", status_code=204)
async def delete_image(image_id: int, db: AsyncSession = Depends(get_db)):
    image = await crud.get_image(db, image_id)
    if not image:
        raise HTTPException(status_code=404, detail="Image not found")
    await crud.delete_image(db, image)
