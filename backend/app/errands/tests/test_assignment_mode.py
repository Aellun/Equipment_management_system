"""Assignment-mode toggle: auto vs manual, reassignment, and runner pool."""
from app.errands.tests.conftest import auth_header


def _book_and_pay(client, cust, svc_id):
    task_id = client.post(
        "/errands/tasks", headers=cust,
        json={"service_type_id": svc_id, "distance_km": 2, "urgency": "standard", "phone": "254712345678"},
    ).json()["id"]
    chk = client.post(f"/errands/payments/tasks/{task_id}/pay", headers=cust).json()["checkout_request_id"]
    settled = client.post(
        f"/errands/payments/mpesa/simulate?checkout_request_id={chk}&success=true", headers=cust
    ).json()
    return task_id, settled


def test_manual_mode_leaves_task_unassigned_then_admin_assigns(client, seeded):
    admin = auth_header(client, "admin@momaemjay.co.ke", "admin1234")
    cust = auth_header(client, "c@t.co")
    svc_id = seeded["service"].id
    runner_id = seeded["runner"].id

    # Turn auto-assign OFF.
    client.post("/errands/admin/settings/auto-assign?enabled=false", headers=admin)
    assert client.get("/errands/admin/settings", headers=admin).json()["auto_assign"] is False

    # Paid task stays unassigned in manual mode.
    task_id, settled = _book_and_pay(client, cust, svc_id)
    assert settled["status"] == "paid"
    assert settled["runner"] is None

    # Runner cannot see it in the pool (manual mode).
    run = auth_header(client, "r@t.co")
    assert client.get("/errands/runners/available-tasks", headers=run).json() == []

    # Admin assigns it.
    assigned = client.post(
        f"/errands/admin/tasks/{task_id}/assign?runner_id={runner_id}", headers=admin
    ).json()
    assert assigned["status"] == "assigned"
    assert assigned["runner"]["id"] == runner_id


def test_auto_mode_pool_visible_and_claimable(client, seeded, db_session):
    from app.errands.models.user import RunnerProfile, User, UserRole, VerificationStatus
    from app.errands.core.security import hash_password

    admin = auth_header(client, "admin@momaemjay.co.ke", "admin1234")
    cust = auth_header(client, "c@t.co")
    svc_id = seeded["service"].id

    # Make the only runner unavailable so auto-assign finds nobody → goes to pool.
    seeded["runner"].runner_profile.is_available = False
    db_session.commit()

    client.post("/errands/admin/settings/auto-assign?enabled=true", headers=admin)
    task_id, settled = _book_and_pay(client, cust, svc_id)
    assert settled["status"] == "paid"  # no runner available → sits in pool

    # Add a second, available runner who can see and claim it.
    u = User(full_name="Pool Runner", email="pool@t.co", phone="254700000999",
             hashed_password=hash_password("pass123"), role=UserRole.runner)
    db_session.add(u); db_session.flush()
    db_session.add(RunnerProfile(user_id=u.id, verification_status=VerificationStatus.verified, is_available=True))
    db_session.commit()

    run = auth_header(client, "pool@t.co")
    pool = client.get("/errands/runners/available-tasks", headers=run).json()
    assert any(t["id"] == task_id for t in pool)

    claimed = client.post(f"/errands/runners/tasks/{task_id}/claim", headers=run).json()
    assert claimed["status"] == "assigned"
    assert claimed["runner"]["full_name"] == "Pool Runner"


def test_reassign_moves_task_and_clears_proof(client, seeded, db_session):
    from app.errands.models.user import RunnerProfile, User, UserRole, VerificationStatus
    from app.errands.core.security import hash_password

    admin = auth_header(client, "admin@momaemjay.co.ke", "admin1234")
    cust = auth_header(client, "c@t.co")
    svc_id = seeded["service"].id

    # Auto-assign to the seeded runner.
    task_id, settled = _book_and_pay(client, cust, svc_id)
    assert settled["runner"]["id"] == seeded["runner"].id

    # Second runner to receive the reassignment.
    u = User(full_name="Backup Runner", email="backup@t.co", phone="254700000888",
             hashed_password=hash_password("pass123"), role=UserRole.runner)
    db_session.add(u); db_session.flush()
    db_session.add(RunnerProfile(user_id=u.id, verification_status=VerificationStatus.verified, is_available=True))
    db_session.commit()

    reassigned = client.post(
        f"/errands/admin/tasks/{task_id}/assign?runner_id={u.id}", headers=admin
    ).json()
    assert reassigned["runner"]["id"] == u.id
    assert reassigned["status"] == "assigned"
    assert reassigned["proof_photo_url"] is None
