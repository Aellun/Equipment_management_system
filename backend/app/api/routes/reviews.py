from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_db
from app.crud import review as crud
from app.schemas.review import ReviewCreate, ReviewOut, ReviewSummary

router = APIRouter(prefix="/reviews", tags=["Reviews"])


@router.post("/", response_model=ReviewOut, status_code=201)
async def create_review(payload: ReviewCreate, db: AsyncSession = Depends(get_db)):
    return await crud.create(db, payload)


@router.get("/product/{product_id}", response_model=list[ReviewOut])
async def product_reviews(product_id: int, db: AsyncSession = Depends(get_db)):
    return await crud.for_product(db, product_id)


@router.get("/product/{product_id}/summary", response_model=ReviewSummary)
async def product_review_summary(product_id: int, db: AsyncSession = Depends(get_db)):
    return await crud.summary_for_product(db, product_id)


@router.get("/store", response_model=list[ReviewOut])
async def store_reviews(db: AsyncSession = Depends(get_db)):
    return await crud.store_reviews(db)


@router.get("/store/summary", response_model=ReviewSummary)
async def store_review_summary(db: AsyncSession = Depends(get_db)):
    return await crud.store_summary(db)


# ---- Admin moderation ----
@router.get("/", response_model=list[ReviewOut])
async def all_reviews(db: AsyncSession = Depends(get_db)):
    return await crud.get_all(db)


@router.delete("/{review_id}", status_code=204)
async def delete_review(review_id: int, db: AsyncSession = Depends(get_db)):
    review = await crud.get_by_id(db, review_id)
    if not review:
        raise HTTPException(status_code=404, detail="Review not found")
    await crud.delete(db, review)
