"""Public storefront endpoints (read-only product browsing + customer auth)."""
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_db
from app.crud import product as product_crud
from app.crud import shop_category as category_crud
from app.crud import customer as customer_crud
from app.crud import department as department_crud
from app.crud import delivery as delivery_crud
from app.crud import review as review_crud
from app.schemas.product import ProductOut
from app.schemas.shop_category import ShopCategoryOut
from app.schemas.department import DepartmentOut
from app.schemas.delivery import DeliveryZoneOut
from app.schemas.customer import CustomerRegister, CustomerLogin, CustomerOut

router = APIRouter(prefix="/shop", tags=["Storefront"])


def _attach_aggregates(product, aggregates: dict) -> ProductOut:
    out = ProductOut.model_validate(product)
    avg, count = aggregates.get(product.id, (None, 0))
    out.avg_rating = avg
    out.review_count = count
    return out


@router.get("/categories", response_model=list[ShopCategoryOut])
async def list_categories(db: AsyncSession = Depends(get_db)):
    return await category_crud.get_all(db)


@router.get("/departments", response_model=list[DepartmentOut])
async def list_departments(db: AsyncSession = Depends(get_db)):
    return await department_crud.get_all(db, active_only=True)


@router.get("/delivery-zones", response_model=list[DeliveryZoneOut])
async def list_delivery_zones(db: AsyncSession = Depends(get_db)):
    return await delivery_crud.get_all(db, active_only=True)


@router.get("/settings")
async def store_settings(db: AsyncSession = Depends(get_db)):
    return await department_crud.get_settings(db)


@router.get("/products", response_model=list[ProductOut])
async def list_products(
    category: str | None = Query(default=None, description="category slug"),
    department: str | None = Query(default=None, description="department slug"),
    search: str | None = None,
    db: AsyncSession = Depends(get_db),
):
    products = await product_crud.get_all(db, active_only=True)
    if department:
        depts = await department_crud.get_all(db)
        dept_id = next((d.id for d in depts if d.slug == department), -1)
        products = [p for p in products if p.department_id == dept_id]
    if category:
        cat = await category_crud.get_by_slug(db, category)
        cat_id = cat.id if cat else -1
        products = [p for p in products if p.shop_category_id == cat_id]
    if search:
        q = search.lower()
        products = [p for p in products if q in p.name.lower() or (p.description or "").lower().find(q) >= 0]

    aggregates = await review_crud.aggregates_by_product(db)
    return [_attach_aggregates(p, aggregates) for p in products]


@router.get("/products/{slug}", response_model=ProductOut)
async def get_product(slug: str, db: AsyncSession = Depends(get_db)):
    product = await product_crud.get_by_slug(db, slug)
    if not product or not product.is_active:
        raise HTTPException(status_code=404, detail="Product not found")
    summary = await review_crud.summary_for_product(db, product.id)
    out = ProductOut.model_validate(product)
    out.avg_rating = summary["avg_rating"]
    out.review_count = summary["review_count"]
    return out


# ---- Customer auth (kept for future use; not exposed in the storefront UI) ----
@router.post("/auth/register", response_model=CustomerOut, status_code=201)
async def register(payload: CustomerRegister, db: AsyncSession = Depends(get_db)):
    if await customer_crud.get_by_email(db, payload.email):
        raise HTTPException(status_code=400, detail="Email already registered")
    return await customer_crud.create(db, payload)


@router.post("/auth/login", response_model=CustomerOut)
async def login(payload: CustomerLogin, db: AsyncSession = Depends(get_db)):
    customer = await customer_crud.get_by_email(db, payload.email)
    if not customer or not customer_crud.verify_password(payload.password, customer.password_hash):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    return customer
