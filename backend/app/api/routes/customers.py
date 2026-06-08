from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_db
from app.crud import customer as crud
from app.schemas.customer import CustomerOut

router = APIRouter(prefix="/customers", tags=["Customers"])


@router.get("/", response_model=list[CustomerOut])
async def list_customers(db: AsyncSession = Depends(get_db)):
    return await crud.get_all(db)


@router.get("/{customer_id}", response_model=CustomerOut)
async def get_customer(customer_id: int, db: AsyncSession = Depends(get_db)):
    customer = await crud.get_by_id(db, customer_id)
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")
    return customer
