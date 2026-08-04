"""Transparent pricing engine.

Every quote is itemised so the customer sees exactly what they pay BEFORE
booking. Pure functions, no DB, so they're trivially testable.

Two shapes, because an errand and a clean are not priced the same way:

    Errands (QuoteMode.distance)
        total = base + distance_fee + urgency_fee + service_fee

    Cleaning (QuoteMode.rooms / QuoteMode.unit)
        subtotal = base + size_fee + extras_fee
        total    = subtotal - frequency_discount + service_fee

Room-count pricing and a recurring-plan discount are the industry standard for
residential cleaning: a customer on a weekly plan is worth many times a one-off,
so the discount is the main lever that converts them. Commercial work
(QuoteMode.survey) is never priced here — it is quoted after a site visit.
"""
from dataclasses import dataclass

from app.errands.models.service import QuoteMode, ServiceType
from app.errands.models.task import Frequency, Urgency

# Distance pricing (errands)
FREE_RADIUS_KM = 3.0
PER_KM_RATE = 35.0  # KSh per km beyond the free radius

# Urgency surcharge as a fraction of base price
URGENCY_MULTIPLIER = {
    Urgency.standard: 0.0,
    Urgency.express: 0.40,   # +40% for ~2h turnaround
    Urgency.sameday: 0.15,   # +15% for guaranteed same-day window
}

# Platform service fee: max(flat, percent of subtotal)
SERVICE_FEE_FLAT = 30.0
SERVICE_FEE_PERCENT = 0.10

# ── Cleaning: size pricing ───────────────────────────────────────
# Charged per room beyond what the service's base price already covers.
PER_BEDROOM_RATE = 700.0
PER_BATHROOM_RATE = 500.0
MAX_BEDROOMS = 8
MAX_BATHROOMS = 6

# ── Cleaning: recurring-plan discount ────────────────────────────
# The more often we visit, the lower the per-visit price. Shown on the booking
# page as the reason to commit to a plan.
FREQUENCY_DISCOUNT = {
    Frequency.one_off: 0.0,
    Frequency.monthly: 0.05,
    Frequency.fortnightly: 0.10,
    Frequency.weekly: 0.15,
}

FREQUENCY_LABELS = {
    Frequency.one_off: "One-off clean",
    Frequency.monthly: "Every month",
    Frequency.fortnightly: "Every 2 weeks",
    Frequency.weekly: "Every week",
}

# ── Cleaning: optional extras ────────────────────────────────────
# slug -> (label, price KSh)
EXTRAS: dict[str, tuple[str, float]] = {
    "inside-oven": ("Inside the oven", 800.0),
    "inside-fridge": ("Inside the fridge", 600.0),
    "interior-windows": ("Interior windows", 900.0),
    "laundry-ironing": ("Laundry & ironing", 700.0),
    "inside-cabinets": ("Inside cabinets", 600.0),
    "balcony": ("Balcony / terrace", 500.0),
}


@dataclass(frozen=True)
class Quote:
    base_price: float
    distance_fee: float
    urgency_fee: float
    size_fee: float
    extras_fee: float
    frequency_discount: float
    service_fee: float
    total_price: float
    goods_paid_separately: bool

    def as_dict(self) -> dict:
        return {
            "base_price": self.base_price,
            "distance_fee": self.distance_fee,
            "urgency_fee": self.urgency_fee,
            "size_fee": self.size_fee,
            "extras_fee": self.extras_fee,
            "frequency_discount": self.frequency_discount,
            "service_fee": self.service_fee,
            "total_price": self.total_price,
            "goods_paid_separately": self.goods_paid_separately,
        }


def _round(amount: float) -> float:
    # Round to the nearest 5 shillings — friendlier for M-Pesa.
    return round(amount / 5.0) * 5.0


def extras_total(slugs: list[str] | None) -> float:
    """Sum the chosen extras, ignoring anything we don't recognise."""
    return sum(EXTRAS[s][1] for s in (slugs or []) if s in EXTRAS)


def calculate_quote(
    service: ServiceType,
    distance_km: float = 0.0,
    urgency: Urgency = Urgency.standard,
    *,
    bedrooms: int = 0,
    bathrooms: int = 0,
    quantity: int = 1,
    frequency: Frequency = Frequency.one_off,
    extras: list[str] | None = None,
) -> Quote:
    mode = service.quote_mode

    if mode == QuoteMode.survey:
        raise ValueError("This service is quoted after a site survey, not online.")

    base = float(service.base_price)
    distance_fee = urgency_fee = size_fee = extras_charge = discount = 0.0

    if mode == QuoteMode.rooms:
        # Clamp to the range the booking form offers, so a hand-crafted
        # request can't run the price away.
        beds = max(0, min(int(bedrooms), MAX_BEDROOMS))
        baths = max(0, min(int(bathrooms), MAX_BATHROOMS))
        extra_beds = max(0, beds - int(service.included_bedrooms))
        extra_baths = max(0, baths - int(service.included_bathrooms))
        size_fee = _round(extra_beds * PER_BEDROOM_RATE + extra_baths * PER_BATHROOM_RATE)
        extras_charge = _round(extras_total(extras))

    elif mode == QuoteMode.unit:
        # Per-unit services scale the base price by how many units are serviced.
        base = _round(base * max(1, int(quantity)))
        extras_charge = _round(extras_total(extras))

    else:  # QuoteMode.distance — errands
        billable_km = max(0.0, distance_km - FREE_RADIUS_KM)
        distance_fee = _round(billable_km * PER_KM_RATE)
        urgency_fee = _round(base * URGENCY_MULTIPLIER.get(urgency, 0.0))

    subtotal = base + distance_fee + urgency_fee + size_fee + extras_charge

    if mode in (QuoteMode.rooms, QuoteMode.unit):
        discount = _round(subtotal * FREQUENCY_DISCOUNT.get(frequency, 0.0))

    service_fee = _round(max(SERVICE_FEE_FLAT, (subtotal - discount) * SERVICE_FEE_PERCENT))
    total = _round(subtotal - discount + service_fee)

    return Quote(
        base_price=base,
        distance_fee=distance_fee,
        urgency_fee=urgency_fee,
        size_fee=size_fee,
        extras_fee=extras_charge,
        frequency_discount=discount,
        service_fee=service_fee,
        total_price=total,
        goods_paid_separately=service.goods_paid_separately,
    )
