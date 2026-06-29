import os

os.environ.setdefault("MPESA_MOCK", "true")
os.environ.setdefault("ERRANDS_MEDIA_DIR", "/tmp/dyzah_media_test")
# Importing app.main pulls in the async main app, whose Settings requires a
# DATABASE_URL. This dummy URL is never connected (the async engine is lazy and
# get_db is overridden with SQLite below).
os.environ.setdefault("DATABASE_URL", "postgresql+asyncpg://x:x@localhost/x")

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.errands.core.db import Base, get_db
from app.errands.core.security import hash_password
from app.main import app
from app.errands.models.service import ServiceType
from app.errands.models.user import RunnerProfile, User, UserRole, VerificationStatus


@pytest.fixture()
def db_session():
    engine = create_engine(
        "sqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    TestingSession = sessionmaker(bind=engine, autoflush=False, autocommit=False)
    Base.metadata.create_all(bind=engine)
    db = TestingSession()
    try:
        yield db
    finally:
        db.close()
        Base.metadata.drop_all(bind=engine)


@pytest.fixture()
def client(db_session):
    app.dependency_overrides[get_db] = lambda: db_session
    yield TestClient(app)
    app.dependency_overrides.clear()


@pytest.fixture()
def seeded(db_session):
    svc = ServiceType(
        slug="pharmacy-run", name="Pharmacy Run", category="Everyday Errands",
        base_price=300, price_unit="service fee", est_minutes=60,
        goods_paid_separately=True, is_active=True,
    )
    customer = User(
        full_name="Cust", email="c@t.co", phone="254712345678",
        hashed_password=hash_password("pass123"), role=UserRole.customer,
    )
    runner = User(
        full_name="Run", email="r@t.co", phone="254711111111",
        hashed_password=hash_password("pass123"), role=UserRole.runner,
    )
    admin = User(
        full_name="Admin", email="admin@momaemjay.co.ke", phone="254700000000",
        hashed_password=hash_password("admin1234"), role=UserRole.admin,
    )
    db_session.add_all([svc, customer, runner, admin])
    db_session.flush()
    db_session.add(
        RunnerProfile(
            user_id=runner.id, suburb="Westlands", skills="delivery",
            verification_status=VerificationStatus.verified,
            is_available=True, rating_avg=4.8, rating_count=10, completed_tasks=10,
        )
    )
    db_session.commit()
    return {"service": svc, "customer": customer, "runner": runner, "admin": admin}


def auth_header(client, email, password="pass123"):
    resp = client.post("/errands/auth/login", json={"email": email, "password": password})
    assert resp.status_code == 200, resp.text
    return {"Authorization": f"Bearer {resp.json()['access_token']}"}
