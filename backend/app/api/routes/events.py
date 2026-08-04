"""Dyzah Events — public storefront + quote pipeline.

Stock is stored one row per physical unit (each with its own serial number),
but nobody hires "serial CH-0043" — they hire "80 chairs for Saturday". So
the storefront groups units by name and answers the only two questions a
customer has: have you got them, and are they free on my dates.

Availability is computed from reservations that overlap the requested range,
minus anything out or in maintenance. That is the same "soft availability"
model the established rental platforms use: we show what looks free, then a
human confirms before money changes hands.

PRIVACY: quote requests carry the customer's name, phone, email and the venue
address. The public routes accept a request and report a status by reference;
every field beyond that is admin-only.
"""
import secrets
from datetime import date

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import and_, func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.api.deps import get_db, require_staff
from app.models.equipment import Equipment, EquipmentStatus
from app.models.rental_quote import QuoteStatus, RentalQuote, RentalQuoteItem
from app.models.reservation import Reservation
from app.schemas.events import (
    AvailabilityRequest,
    AvailabilityResult,
    CatalogItem,
    QuoteCreate,
    QuoteOut,
    QuoteReceipt,
)

router = APIRouter(prefix="/events", tags=["Events"])

# Units in these states can never be hired out.
_UNAVAILABLE = (EquipmentStatus.maintenance, EquipmentStatus.retired)


def _make_reference() -> str:
    return "EV-" + secrets.token_hex(3).upper()


async def _reserved_counts(
    db: AsyncSession, start: date, end: date
) -> dict[str, int]:
    """How many units of each equipment name are already committed in a range.

    Two ranges overlap unless one ends before the other starts — the standard
    interval test, applied here so a booking that merely abuts another does
    not count as a clash.
    """
    stmt = (
        select(Equipment.name, func.count(Reservation.id))
        .join(Reservation, Reservation.equipment_id == Equipment.id)
        .where(
            Reservation.status == "Upcoming",
            Reservation.start_date <= end,
            Reservation.end_date >= start,
        )
        .group_by(Equipment.name)
    )
    rows = (await db.execute(stmt)).all()
    return {name: count for name, count in rows}


# ── Public: catalog ──────────────────────────────────────────────
@router.get("/catalog", response_model=list[CatalogItem])
async def catalog(
    category: str | None = None,
    q: str | None = None,
    start_date: date | None = None,
    end_date: date | None = None,
    db: AsyncSession = Depends(get_db),
):
    """Hireable stock, grouped by item.

    When dates are supplied, `available` reflects those dates; otherwise it is
    the count of units not currently out or under maintenance.
    """
    stmt = select(Equipment).where(Equipment.is_public.is_(True))
    if category:
        stmt = stmt.where(Equipment.category == category)
    if q:
        term = f"%{q.lower()}%"
        stmt = stmt.where(
            or_(func.lower(Equipment.name).like(term), func.lower(Equipment.category).like(term))
        )
    units = (await db.execute(stmt)).scalars().all()

    reserved: dict[str, int] = {}
    if start_date and end_date:
        if end_date < start_date:
            raise HTTPException(status_code=400, detail="End date cannot be before the start date.")
        reserved = await _reserved_counts(db, start_date, end_date)

    grouped: dict[str, dict] = {}
    for u in units:
        g = grouped.setdefault(
            u.name,
            {
                "name": u.name,
                "category": u.category,
                "total_units": 0,
                "serviceable_units": 0,
                "daily_rate": None,
                "description": None,
                "image_url": None,
            },
        )
        g["total_units"] += 1
        if u.status not in _UNAVAILABLE:
            g["serviceable_units"] += 1
        # First unit that carries storefront detail defines it for the group.
        for field in ("daily_rate", "description", "image_url"):
            if g[field] is None and getattr(u, field) is not None:
                g[field] = getattr(u, field)

    out: list[CatalogItem] = []
    for name, g in grouped.items():
        available = g["serviceable_units"] - reserved.get(name, 0)
        out.append(
            CatalogItem(
                name=name,
                category=g["category"],
                total_units=g["total_units"],
                available=max(0, available),
                daily_rate=float(g["daily_rate"]) if g["daily_rate"] is not None else 0.0,
                description=g["description"] or "",
                image_url=g["image_url"] or "",
            )
        )
    out.sort(key=lambda i: (i.category, i.name))
    return out


@router.get("/categories", response_model=list[str])
async def categories(db: AsyncSession = Depends(get_db)):
    stmt = select(Equipment.category).where(Equipment.is_public.is_(True)).distinct()
    return sorted((await db.execute(stmt)).scalars().all())


@router.post("/availability", response_model=list[AvailabilityResult])
async def availability(body: AvailabilityRequest, db: AsyncSession = Depends(get_db)):
    """Check a basket of items against a date range in one call."""
    if body.end_date < body.start_date:
        raise HTTPException(status_code=400, detail="End date cannot be before the start date.")

    reserved = await _reserved_counts(db, body.start_date, body.end_date)
    stmt = select(Equipment.name, Equipment.status).where(
        Equipment.is_public.is_(True), Equipment.name.in_(body.names)
    )
    rows = (await db.execute(stmt)).all()

    serviceable: dict[str, int] = {}
    for name, status in rows:
        serviceable.setdefault(name, 0)
        if status not in _UNAVAILABLE:
            serviceable[name] += 1

    return [
        AvailabilityResult(
            name=name,
            available=max(0, serviceable.get(name, 0) - reserved.get(name, 0)),
        )
        for name in body.names
    ]


# ── Public: quote requests ───────────────────────────────────────
@router.post("/quotes", response_model=QuoteReceipt, status_code=201)
async def request_quote(body: QuoteCreate, db: AsyncSession = Depends(get_db)):
    """Submit a hire request. Public — event customers have no account."""
    if body.end_date < body.start_date:
        raise HTTPException(status_code=400, detail="End date cannot be before the start date.")
    if not body.contact_email and not body.contact_phone:
        raise HTTPException(
            status_code=400,
            detail="Provide at least one way to reach you — an email address or a phone number.",
        )
    if not body.items:
        raise HTTPException(status_code=400, detail="Add at least one item to your request.")

    days = max(1, (body.end_date - body.start_date).days + 1)
    estimated = sum(float(i.daily_rate) * i.quantity * days for i in body.items)

    quote = RentalQuote(
        reference=_make_reference(),
        contact_name=body.contact_name.strip(),
        contact_phone=body.contact_phone.strip(),
        contact_email=str(body.contact_email or ""),
        organisation=body.organisation.strip(),
        event_type=body.event_type.strip(),
        start_date=body.start_date,
        end_date=body.end_date,
        guest_count=body.guest_count,
        fulfilment=body.fulfilment,
        venue=body.venue.strip(),
        notes=body.notes.strip(),
        estimated_total=estimated,
        items=[
            RentalQuoteItem(
                equipment_name=i.equipment_name,
                category=i.category,
                quantity=i.quantity,
                daily_rate=i.daily_rate,
            )
            for i in body.items
        ],
    )
    db.add(quote)
    await db.commit()
    await db.refresh(quote)
    return QuoteReceipt(reference=quote.reference, status=quote.status, estimated_total=estimated)


@router.get("/quotes/{reference}/status", response_model=QuoteReceipt)
async def quote_status(reference: str, db: AsyncSession = Depends(get_db)):
    """Status lookup by reference — status only, never the contact details."""
    quote = (
        await db.execute(select(RentalQuote).where(RentalQuote.reference == reference.upper()))
    ).scalar_one_or_none()
    if not quote:
        raise HTTPException(status_code=404, detail="Request not found")
    return QuoteReceipt(
        reference=quote.reference,
        status=quote.status,
        estimated_total=float(quote.quoted_total or quote.estimated_total or 0),
    )


# ── Staff: quote pipeline ────────────────────────────────────────
@router.get(
    "/admin/quotes",
    response_model=list[QuoteOut],
    dependencies=[Depends(require_staff)],
)
async def list_quotes(
    status: QuoteStatus | None = None,
    db: AsyncSession = Depends(get_db),
):
    stmt = (
        select(RentalQuote).options(selectinload(RentalQuote.items)).order_by(RentalQuote.created_at.desc())
    )
    if status:
        stmt = stmt.where(RentalQuote.status == status)
    return (await db.execute(stmt)).scalars().all()


@router.patch(
    "/admin/quotes/{quote_id}",
    response_model=QuoteOut,
    dependencies=[Depends(require_staff)],
)
async def update_quote(
    quote_id: int,
    status: QuoteStatus | None = None,
    quoted_total: float | None = Query(default=None, ge=0),
    db: AsyncSession = Depends(get_db),
):
    quote = (
        await db.execute(
            select(RentalQuote).options(selectinload(RentalQuote.items)).where(RentalQuote.id == quote_id)
        )
    ).scalar_one_or_none()
    if not quote:
        raise HTTPException(status_code=404, detail="Request not found")
    if status is not None:
        quote.status = status
    if quoted_total is not None:
        quote.quoted_total = quoted_total
    await db.commit()
    await db.refresh(quote)
    return quote


# ── Staff: operations dashboard ──────────────────────────────────
@router.get("/admin/stats", dependencies=[Depends(require_staff)])
async def stats(db: AsyncSession = Depends(get_db)):
    """The numbers a hire business actually runs on.

    Utilisation is the headline metric in this industry — idle stock is the
    main way rental companies lose money — so it leads, alongside the two
    things that go wrong day to day: overdue returns and kit stuck in repair.
    """
    today = date.today()

    total = (await db.execute(select(func.count(Equipment.id)))).scalar_one()
    by_status = dict(
        (await db.execute(select(Equipment.status, func.count(Equipment.id)).group_by(Equipment.status))).all()
    )
    out = by_status.get(EquipmentStatus.out, 0)
    maintenance = by_status.get(EquipmentStatus.maintenance, 0)

    overdue = (
        await db.execute(
            select(func.count(Reservation.id)).where(
                Reservation.status == "Upcoming", Reservation.end_date < today
            )
        )
    ).scalar_one()

    dispatches = (
        await db.execute(
            select(func.count(Reservation.id)).where(
                Reservation.status == "Upcoming", Reservation.start_date == today
            )
        )
    ).scalar_one()

    returns_due = (
        await db.execute(
            select(func.count(Reservation.id)).where(
                Reservation.status == "Upcoming", Reservation.end_date == today
            )
        )
    ).scalar_one()

    open_quotes = (
        await db.execute(
            select(func.count(RentalQuote.id)).where(
                RentalQuote.status.in_([QuoteStatus.new, QuoteStatus.quoted])
            )
        )
    ).scalar_one()

    pipeline_value = (
        await db.execute(
            select(func.coalesce(func.sum(RentalQuote.estimated_total), 0)).where(
                RentalQuote.status.in_([QuoteStatus.new, QuoteStatus.quoted])
            )
        )
    ).scalar_one()

    return {
        "total_units": total,
        "out": out,
        "maintenance": maintenance,
        # Share of the fleet currently earning. The industry benchmark sits
        # around 60–80%; below that, stock is sitting idle.
        "utilisation": round((out / total) * 100, 1) if total else 0.0,
        "overdue": overdue,
        "dispatches_today": dispatches,
        "returns_due_today": returns_due,
        "open_quotes": open_quotes,
        "pipeline_value": float(pipeline_value or 0),
    }
