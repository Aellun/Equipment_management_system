"""Social login: provider gating, state integrity and account matching."""
import pytest
from sqlalchemy import select

from app.errands.core import oauth
from app.errands.core.config import settings
from app.errands.models.oauth_account import OAuthAccount
from app.errands.models.user import User, UserRole
from app.errands.routers.auth import _link_or_create


@pytest.fixture()
def google_configured(monkeypatch):
    monkeypatch.setattr(settings, "OAUTH_GOOGLE_CLIENT_ID", "test-client-id")
    monkeypatch.setattr(settings, "OAUTH_GOOGLE_CLIENT_SECRET", "test-secret")


# ── Provider gating ──────────────────────────────────────────────


def test_every_provider_is_listed_even_without_credentials(client):
    """The buttons always show; `configured` is what drives their state."""
    body = client.get("/errands/auth/providers").json()
    assert [p["key"] for p in body] == ["google", "facebook", "github", "microsoft"]
    assert all(p["configured"] is False for p in body)


def test_configured_provider_is_flagged(client, google_configured):
    body = {p["key"]: p["configured"] for p in client.get("/errands/auth/providers").json()}
    assert body["google"] is True
    assert body["facebook"] is False


def test_start_404s_for_unconfigured_provider(client):
    assert client.get("/errands/auth/oauth/google/start").status_code == 404


def test_start_redirects_to_provider_with_our_callback(client, google_configured):
    resp = client.get(
        "/errands/auth/oauth/google/start?next=/services/book/3&popup=true",
        follow_redirects=False,
    )
    assert resp.status_code == 302
    target = resp.headers["location"]
    assert target.startswith("https://accounts.google.com/o/oauth2/v2/auth?")
    assert "client_id=test-client-id" in target
    assert "%2Fapi%2Ferrands%2Fauth%2Foauth%2Fgoogle%2Fcallback" in target


# ── State ────────────────────────────────────────────────────────


def test_state_round_trips_and_is_provider_bound():
    state = oauth.make_state("google", "/services/book/3", popup=True)
    claims = oauth.read_state(state, "google")
    assert claims and claims["n"] == "/services/book/3" and claims["w"] is True
    # A state minted for one provider must not unlock another.
    assert oauth.read_state(state, "facebook") is None


def test_tampered_state_is_rejected(client, google_configured):
    resp = client.get(
        "/errands/auth/oauth/google/callback?code=abc&state=not-a-real-state",
        follow_redirects=False,
    )
    assert resp.status_code == 302
    assert "error=" in resp.headers["location"]
    assert "token=" not in resp.headers["location"]


@pytest.mark.parametrize(
    "path,expected",
    [
        ("/services/book/3", "/services/book/3"),
        ("https://evil.example/steal", "/services"),  # absolute → dropped
        ("//evil.example/steal", "/services"),  # protocol-relative → dropped
        ("", "/services"),
    ],
)
def test_next_path_cannot_leave_the_site(path, expected):
    assert oauth.safe_next(path) == expected


# ── Account matching ─────────────────────────────────────────────


def _profile(sub="g-1", email="new@t.co", name="New Person"):
    return oauth.Profile(subject=sub, email=email, full_name=name)


def test_first_sign_in_creates_a_customer(db_session):
    user = _link_or_create(db_session, "google", _profile())
    assert user.role == UserRole.customer
    assert user.email == "new@t.co"
    # No password means no password can ever match.
    assert user.hashed_password == ""
    assert db_session.scalar(select(OAuthAccount).where(OAuthAccount.user_id == user.id))


def test_same_identity_returns_the_same_account(db_session):
    first = _link_or_create(db_session, "google", _profile())
    second = _link_or_create(db_session, "google", _profile(name="Renamed"))
    assert first.id == second.id
    links = db_session.scalars(select(OAuthAccount)).all()
    assert len(links) == 1


def test_matching_email_links_to_the_existing_password_account(db_session, seeded):
    customer = seeded["customer"]
    user = _link_or_create(db_session, "google", _profile(email=customer.email))
    assert user.id == customer.id
    # The password login still works — the identity was linked, not replaced.
    assert user.hashed_password
    link = db_session.scalar(select(OAuthAccount).where(OAuthAccount.user_id == user.id))
    assert link and link.provider == "google"


def test_second_provider_links_to_the_same_account(db_session):
    google = _link_or_create(db_session, "google", _profile(sub="g-1"))
    facebook = _link_or_create(db_session, "facebook", _profile(sub="f-9"))
    assert google.id == facebook.id
    assert len(db_session.scalars(select(OAuthAccount)).all()) == 2


def test_social_account_cannot_be_password_logged_in(client, db_session):
    _link_or_create(db_session, "google", _profile(email="social@t.co"))
    for attempt in ["", "password", "None"]:
        resp = client.post(
            "/errands/auth/login", json={"email": "social@t.co", "password": attempt}
        )
        assert resp.status_code == 401


def test_runner_role_is_never_granted_by_social_sign_in(db_session, seeded):
    runner = seeded["runner"]
    user = _link_or_create(db_session, "google", _profile(email=runner.email))
    # Linking to an existing runner keeps their role; it never invents one.
    assert user.role == UserRole.runner
    fresh = _link_or_create(db_session, "google", _profile(sub="g-2", email="fresh@t.co"))
    assert fresh.role == UserRole.customer
    assert db_session.get(User, fresh.id).role == UserRole.customer
