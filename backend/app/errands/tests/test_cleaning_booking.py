"""Dyzah Hygiene cleaning bookings.

Covers the two things that make a clean different from an errand: it is priced
from the size of the property and how often we come, and it records where
someone lives plus how to get in — which must not be public.
"""
import pytest

from app.errands.models.service import QuoteMode, ServiceType
from app.errands.models.task import Frequency
from app.errands.services.pricing import calculate_quote
from app.errands.tests.conftest import auth_header


@pytest.fixture()
def home_clean(db_session):
    svc = ServiceType(
        slug="test-housekeeping", name="Routine Housekeeping", vertical="hygiene",
        category="Residential Cleaning", base_price=2500, price_unit="per visit",
        est_minutes=180, is_active=True, quote_mode=QuoteMode.rooms,
        included_bedrooms=2, included_bathrooms=1,
    )
    db_session.add(svc)
    db_session.commit()
    return svc


@pytest.fixture()
def office_clean(db_session):
    svc = ServiceType(
        slug="test-office", name="Office Cleaning", vertical="hygiene",
        category="Commercial Cleaning", base_price=4500, price_unit="per session",
        est_minutes=240, is_active=True, quote_mode=QuoteMode.survey,
    )
    db_session.add(svc)
    db_session.commit()
    return svc


# ── Pricing ──────────────────────────────────────────────────────
def test_rooms_within_the_base_size_add_nothing(home_clean):
    q = calculate_quote(home_clean, bedrooms=2, bathrooms=1)
    assert q.size_fee == 0
    assert q.base_price == 2500


def test_extra_rooms_are_charged(home_clean):
    q = calculate_quote(home_clean, bedrooms=4, bathrooms=3)
    # 2 extra bedrooms @700 + 2 extra bathrooms @500
    assert q.size_fee == 2400


def test_room_counts_are_clamped(home_clean):
    """A hand-crafted request must not be able to run the price away."""
    huge = calculate_quote(home_clean, bedrooms=999, bathrooms=999)
    capped = calculate_quote(home_clean, bedrooms=8, bathrooms=6)
    assert huge.size_fee == capped.size_fee


def test_recurring_visits_cost_less_per_clean(home_clean):
    prices = {
        f: calculate_quote(home_clean, bedrooms=3, bathrooms=2, frequency=f).total_price
        for f in Frequency
    }
    assert prices[Frequency.weekly] < prices[Frequency.fortnightly]
    assert prices[Frequency.fortnightly] < prices[Frequency.monthly]
    assert prices[Frequency.monthly] < prices[Frequency.one_off]


def test_extras_are_added_and_unknown_ones_ignored(home_clean):
    with_extra = calculate_quote(home_clean, bedrooms=2, bathrooms=1, extras=["inside-oven"])
    assert with_extra.extras_fee == 800

    bogus = calculate_quote(home_clean, bedrooms=2, bathrooms=1, extras=["free-mansion"])
    assert bogus.extras_fee == 0


def test_survey_services_are_never_priced_in_code(office_clean):
    with pytest.raises(ValueError):
        calculate_quote(office_clean)


# ── Booking ──────────────────────────────────────────────────────
BOOKING = {
    "service_address": "Kileleshwa, Nairobi",
    "scheduled_date": "2026-09-01",
    "arrival_window": "08:00 – 10:00",
    "frequency": "weekly",
    "bedrooms": 4,
    "bathrooms": 3,
    "extras": ["inside-oven"],
    "access_notes": "Gate 3, ask for the watchman",
    "phone": "254712345678",
}


def _book(client, service, headers, **overrides):
    return client.post(
        "/errands/tasks",
        json={"service_type_id": service.id, **BOOKING, **overrides},
        headers=headers,
    )


def test_booking_records_the_schedule_and_price(client, seeded, home_clean):
    headers = auth_header(client, "c@t.co")
    resp = _book(client, home_clean, headers)
    assert resp.status_code == 201, resp.text
    t = resp.json()

    assert t["scheduled_date"] == "2026-09-01"
    assert t["arrival_window"] == "08:00 – 10:00"
    assert t["frequency"] == "weekly"
    assert t["size_fee"] == 2400
    assert t["extras_fee"] == 800
    assert t["frequency_discount"] > 0
    # Errand-only fields stay empty on a clean.
    assert t["pickup_location"] == ""
    assert t["distance_km"] == 0


def test_survey_services_cannot_be_booked_online(client, seeded, office_clean):
    headers = auth_header(client, "c@t.co")
    resp = _book(client, office_clean, headers)
    assert resp.status_code == 400
    assert "site survey" in resp.json()["detail"]


def test_address_and_access_notes_are_hidden_from_public_tracking(
    client, seeded, home_clean
):
    """Public tracking gives progress, not a stranger's address and how to
    get through their gate."""
    headers = auth_header(client, "c@t.co")
    reference = _book(client, home_clean, headers).json()["reference"]

    public = client.get(f"/errands/tasks/ref/{reference}")
    assert public.status_code == 200
    body = public.json()
    assert body["service_address"] == ""
    assert body["access_notes"] == ""
    assert body["contact_phone"] is None
    assert "Kileleshwa" not in public.text
    assert "watchman" not in public.text


def test_owner_sees_their_own_address(client, seeded, home_clean):
    headers = auth_header(client, "c@t.co")
    task_id = _book(client, home_clean, headers).json()["id"]

    body = client.get(f"/errands/tasks/{task_id}", headers=headers).json()
    assert body["service_address"] == BOOKING["service_address"]
    assert body["access_notes"] == BOOKING["access_notes"]
