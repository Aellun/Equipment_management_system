"""Dyzah Hygiene B2B supply enquiries.

The privacy boundary is the point of most of these: an enquiry carries
prospective-client contact details, so only the admin routes may return them.
"""
from app.errands.tests.conftest import auth_header

VALID = {
    "organisation": "Riverside Secondary School",
    "sector": "School / educational institution",
    "county": "Nairobi",
    "contact_name": "Jane Doe",
    "contact_email": "procurement@example.com",
    "contact_phone": "254700000000",
    "products": "Sanitary pads, Menstrual hygiene kits",
    "estimated_quantity": "400 packs",
    "frequency": "Termly",
    "notes": "Needed before term two.",
}


def _submit(client, **overrides):
    return client.post("/errands/hygiene/enquiries", json={**VALID, **overrides})


def test_submit_returns_reference_without_echoing_pii(client, seeded):
    resp = _submit(client)
    assert resp.status_code == 201, resp.text
    body = resp.json()

    assert body["reference"].startswith("DH-")
    assert body["status"] == "new"
    # The public response must carry nothing but the reference and status.
    assert set(body) == {"reference", "status"}


def test_contact_details_required(client, seeded):
    resp = _submit(client, contact_email=None, contact_phone="")
    assert resp.status_code == 400
    assert "email" in resp.json()["detail"]


def test_phone_only_enquiry_is_accepted(client, seeded):
    """An organisation that would rather be called must not be forced to
    supply an email address."""
    resp = _submit(client, contact_email=None)
    assert resp.status_code == 201, resp.text


def test_public_status_lookup_leaks_no_pii(client, seeded):
    reference = _submit(client).json()["reference"]

    resp = client.get(f"/errands/hygiene/enquiries/{reference}/status")
    assert resp.status_code == 200
    assert resp.json() == {"reference": reference, "status": "new"}

    # Belt and braces: no contact field may appear anywhere in the payload.
    for secret in (VALID["contact_email"], VALID["contact_phone"], VALID["contact_name"]):
        assert secret not in resp.text


def test_status_lookup_is_case_insensitive(client, seeded):
    reference = _submit(client).json()["reference"]
    assert client.get(f"/errands/hygiene/enquiries/{reference.lower()}/status").status_code == 200


def test_unknown_reference_is_404(client, seeded):
    assert client.get("/errands/hygiene/enquiries/DH-000000/status").status_code == 404


def test_admin_list_requires_authentication(client, seeded):
    assert client.get("/errands/hygiene/admin/enquiries").status_code == 401


def test_customer_cannot_read_enquiries(client, seeded):
    """Contact details are admin-only — a signed-in customer is not enough."""
    headers = auth_header(client, "c@t.co")
    assert client.get("/errands/hygiene/admin/enquiries", headers=headers).status_code == 403


def test_admin_sees_full_record(client, seeded):
    reference = _submit(client).json()["reference"]
    headers = auth_header(client, "admin@momaemjay.co.ke", "admin1234")

    rows = client.get("/errands/hygiene/admin/enquiries", headers=headers).json()
    row = next(r for r in rows if r["reference"] == reference)
    assert row["organisation"] == VALID["organisation"]
    assert row["contact_email"] == VALID["contact_email"]
    assert row["contact_phone"] == VALID["contact_phone"]


def test_admin_can_advance_status(client, seeded):
    reference = _submit(client).json()["reference"]
    headers = auth_header(client, "admin@momaemjay.co.ke", "admin1234")
    rows = client.get("/errands/hygiene/admin/enquiries", headers=headers).json()
    enquiry_id = next(r["id"] for r in rows if r["reference"] == reference)

    resp = client.post(
        f"/errands/hygiene/admin/enquiries/{enquiry_id}/status?status=quoted", headers=headers
    )
    assert resp.status_code == 200
    assert resp.json()["status"] == "quoted"

    # …and the public lookup reflects it, still without any PII.
    public = client.get(f"/errands/hygiene/enquiries/{reference}/status").json()
    assert public == {"reference": reference, "status": "quoted"}
