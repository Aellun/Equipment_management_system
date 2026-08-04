"""Transparent pricing engine.

Every quote is itemised so the customer sees exactly what they pay BEFORE
booking — the single biggest gap across competitors (Brons, Savvy, Go hide
prices). Pure functions, no DB, so they're trivially testable.

Formula:
    total = base_price
          + distance_fee  (per-km beyond a free radius)
          + urgency_fee   (surcharge as % of base for express/sameday)
          + service_fee   (platform fee that funds support)
"""
from dataclasses import dataclass

from app.errands.models.service import ServiceType
from app.errands.models.task import Urgency

# Distance pricing
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


@dataclass(frozen=True)
class Quote:
    base_price: float
    distance_fee: float
    urgency_fee: float
    service_fee: float
    total_price: float
    goods_paid_separately: bool

    def as_dict(self) -> dict:
        return {
            "base_price": self.base_price,
            "distance_fee": self.distance_fee,
            "urgency_fee": self.urgency_fee,
            "service_fee": self.service_fee,
            "total_price": self.total_price,
            "goods_paid_separately": self.goods_paid_separately,
        }


def _round(amount: float) -> float:
    # Round to the nearest 5 shillings — friendlier for M-Pesa.
    return round(amount / 5.0) * 5.0


def calculate_quote(
    service: ServiceType, distance_km: float = 0.0, urgency: Urgency = Urgency.standard
) -> Quote:
    base = float(service.base_price)

    billable_km = max(0.0, distance_km - FREE_RADIUS_KM)
    distance_fee = _round(billable_km * PER_KM_RATE)

    urgency_fee = _round(base * URGENCY_MULTIPLIER.get(urgency, 0.0))

    subtotal = base + distance_fee + urgency_fee
    service_fee = _round(max(SERVICE_FEE_FLAT, subtotal * SERVICE_FEE_PERCENT))

    total = _round(subtotal + service_fee)

    return Quote(
        base_price=base,
        distance_fee=distance_fee,
        urgency_fee=urgency_fee,
        service_fee=service_fee,
        total_price=total,
        goods_paid_separately=service.goods_paid_separately,
    )
