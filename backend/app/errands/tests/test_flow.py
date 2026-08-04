"""End-to-end direct-payment + assignment flow against the real API (mock M-Pesa)."""
from app.errands.tests.conftest import auth_header


def test_full_payment_flow(client, seeded):
    cust = auth_header(client, "c@t.co")
    svc_id = seeded["service"].id

    # 1. Quote is transparent and itemised.
    q = client.post(
        "/errands/services/quote",
        json={"service_type_id": svc_id, "distance_km": 8, "urgency": "express"},
    ).json()
    assert q["total_price"] == (
        q["base_price"] + q["distance_fee"] + q["urgency_fee"] + q["service_fee"]
    )

    # 2. Book -> task is in `quoted`.
    book = client.post(
        "/errands/tasks",
        headers=cust,
        json={
            "service_type_id": svc_id,
            "pickup_location": "Sarit",
            "dropoff_location": "Kileleshwa",
            "distance_km": 8,
            "urgency": "express",
            "phone": "254712345678",
        },
    )
    assert book.status_code == 201, book.text
    task = book.json()
    assert task["status"] == "quoted"
    task_id = task["id"]

    # 3. Pay -> STK push (mock) returns a checkout id.
    pay = client.post(f"/errands/payments/tasks/{task_id}/pay", headers=cust).json()
    assert pay["mock"] is True
    checkout_id = pay["checkout_request_id"]

    # 4. Simulate callback success -> paid directly to admin + runner auto-assigned.
    settled = client.post(
        f"/errands/payments/mpesa/simulate?checkout_request_id={checkout_id}&success=true",
        headers=cust,
    ).json()
    assert settled["payment_status"] == "paid"
    assert settled["status"] == "assigned"
    assert settled["runner"] is not None

    # 5. Runner starts the task.
    run = auth_header(client, "r@t.co")
    started = client.post(f"/errands/tasks/{task_id}/start", headers=run)
    assert started.status_code == 200
    assert started.json()["status"] == "in_progress"

    # 6. Runner submits photo proof.
    proof = client.post(
        f"/errands/runners/tasks/{task_id}/proof",
        headers=run,
        data={"proof_note": "Delivered to reception"},
        files={"photo": ("proof.jpg", b"\xff\xd8\xff\xe0fakejpeg", "image/jpeg")},
    )
    assert proof.status_code == 200, proof.text
    assert proof.json()["status"] == "proof_submitted"

    # 7. Customer accepts -> task completed (payment already settled to admin).
    accepted = client.post(f"/errands/tasks/{task_id}/accept", headers=cust).json()
    assert accepted["status"] == "completed"
    assert accepted["payment_status"] == "paid"

    # 8. Customer leaves a review -> runner rating updates.
    reviewed = client.post(
        f"/errands/tasks/{task_id}/review",
        headers=cust,
        json={"rating": 5, "comment": "Fast and friendly"},
    )
    assert reviewed.status_code == 200


def test_cancel_after_payment_keeps_record(client, seeded):
    cust = auth_header(client, "c@t.co")
    svc_id = seeded["service"].id
    task_id = client.post(
        "/errands/tasks", headers=cust,
        json={"service_type_id": svc_id, "distance_km": 2, "urgency": "standard", "phone": "254712345678"},
    ).json()["id"]
    checkout_id = client.post(f"/errands/payments/tasks/{task_id}/pay", headers=cust).json()["checkout_request_id"]
    client.post(f"/errands/payments/mpesa/simulate?checkout_request_id={checkout_id}&success=true", headers=cust)

    cancelled = client.post(f"/errands/tasks/{task_id}/cancel", headers=cust).json()
    assert cancelled["status"] == "cancelled"
    # Money went straight to the admin M-Pesa account; any refund is manual,
    # so the payment record stays "paid".
    assert cancelled["payment_status"] == "paid"


def test_coming_soon_service_cannot_be_booked(client, seeded, db_session):
    from app.errands.models.service import ServiceType
    soon = ServiceType(
        slug="cv-jobs", name="CV Writing", category="Jobs & Careers",
        base_price=0, is_active=False,
    )
    db_session.add(soon)
    db_session.commit()
    cust = auth_header(client, "c@t.co")
    resp = client.post(
        "/errands/tasks", headers=cust,
        json={"service_type_id": soon.id, "distance_km": 0, "urgency": "standard", "phone": "254712345678"},
    )
    assert resp.status_code == 400
