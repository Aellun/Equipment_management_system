from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.errands.core.db import get_db
from app.errands.models.service import QuoteMode, ServiceType
from app.errands.models.task import Urgency
from app.errands.schemas.service import ServiceOut
from app.errands.schemas.task import ExtraOut, PriceBreakdown, QuoteRequest
from app.errands.services.pricing import EXTRAS, calculate_quote

router = APIRouter(prefix="/errands/services", tags=["errands:services"])


@router.get("", response_model=list[ServiceOut])
def list_services(
    vertical: str | None = None,
    category: str | None = None,
    active_only: bool = False,
    db: Session = Depends(get_db),
):
    stmt = select(ServiceType).order_by(ServiceType.sort_order, ServiceType.name)
    if vertical:
        stmt = stmt.where(ServiceType.vertical == vertical)
    if category:
        stmt = stmt.where(ServiceType.category == category)
    if active_only:
        stmt = stmt.where(ServiceType.is_active.is_(True))
    return db.scalars(stmt).all()


@router.get("/categories", response_model=list[str])
def list_categories(vertical: str | None = None, db: Session = Depends(get_db)):
    stmt = select(ServiceType.category).distinct()
    if vertical:
        stmt = stmt.where(ServiceType.vertical == vertical)
    rows = db.scalars(stmt).all()
    return sorted(rows)


@router.get("/extras", response_model=list[ExtraOut])
def list_extras():
    """Optional add-ons offered during a cleaning booking."""
    return [ExtraOut(slug=slug, label=label, price=price) for slug, (label, price) in EXTRAS.items()]


@router.post("/quote", response_model=PriceBreakdown)
def quote(body: QuoteRequest, db: Session = Depends(get_db)):
    service = db.get(ServiceType, body.service_type_id)
    if not service:
        raise HTTPException(status_code=404, detail="Service not found")
    if not service.is_active:
        raise HTTPException(status_code=400, detail="Service not yet available")
    if service.quote_mode == QuoteMode.survey:
        raise HTTPException(
            status_code=400,
            detail="This service is priced after a free site survey.",
        )
    q = calculate_quote(
        service,
        body.distance_km,
        body.urgency,
        bedrooms=body.bedrooms,
        bathrooms=body.bathrooms,
        quantity=body.quantity,
        frequency=body.frequency,
        extras=[s for s in body.extras if s in EXTRAS],
    )
    return PriceBreakdown(**q.as_dict())
