from app.errands.models.service import ServiceType
from app.errands.models.task import Urgency
from app.errands.services.pricing import (
    FREE_RADIUS_KM,
    PER_KM_RATE,
    SERVICE_FEE_FLAT,
    calculate_quote,
)


def make_service(base=300.0, goods=False):
    return ServiceType(
        slug="x", name="Test", category="Everyday Errands",
        base_price=base, price_unit="per trip", est_minutes=60,
        goods_paid_separately=goods, is_active=True,
    )


def test_base_only_within_free_radius():
    q = calculate_quote(make_service(300), distance_km=2.0, urgency=Urgency.standard)
    assert q.base_price == 300
    assert q.distance_fee == 0  # within free radius
    assert q.urgency_fee == 0
    # service fee = max(flat, 10% of 300) = max(30, 30) = 30
    assert q.service_fee == SERVICE_FEE_FLAT
    assert q.total_price == 330


def test_distance_fee_beyond_free_radius():
    # 8 km => 5 billable km * 35 = 175 -> rounds to nearest 5 => 175
    q = calculate_quote(make_service(300), distance_km=8.0, urgency=Urgency.standard)
    billable = 8.0 - FREE_RADIUS_KM
    assert q.distance_fee == round((billable * PER_KM_RATE) / 5) * 5
    assert q.total_price > 330


def test_express_surcharge_applies():
    standard = calculate_quote(make_service(500), 0, Urgency.standard)
    express = calculate_quote(make_service(500), 0, Urgency.express)
    assert express.urgency_fee > 0
    assert express.total_price > standard.total_price


def test_goods_paid_separately_flag_passthrough():
    q = calculate_quote(make_service(350, goods=True), 0, Urgency.standard)
    assert q.goods_paid_separately is True


def test_totals_are_rounded_to_five():
    q = calculate_quote(make_service(317), 6.3, Urgency.express)
    for amount in (q.distance_fee, q.urgency_fee, q.service_fee, q.total_price):
        assert amount % 5 == 0
