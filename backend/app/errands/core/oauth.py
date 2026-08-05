"""Social login (OAuth 2.0 / OIDC) for the Dyzah services accounts.

One small registry drives every provider: Google, Facebook, GitHub, Microsoft
and anything added later. A provider is *enabled* only when its client id and
secret are present in the environment, so an unconfigured deployment simply
shows no social buttons instead of broken ones.

The flow is the standard authorization-code grant:

    /errands/auth/oauth/{provider}/start     → 307 to the provider
    /errands/auth/oauth/{provider}/callback  → code → token → profile → our JWT

`state` is a short-lived signed JWT (not a server-side session) carrying the
provider, a nonce and the post-login destination, so the callback can verify it
was really us who started the dance.
"""
from __future__ import annotations

import secrets
from dataclasses import dataclass, field
from datetime import datetime, timedelta, timezone
from typing import Callable
from urllib.parse import urlencode

import httpx
from jose import JWTError, jwt

from app.errands.core.config import settings

STATE_TTL_MINUTES = 15


@dataclass(frozen=True)
class Profile:
    """The only thing we need back from a provider."""

    subject: str  # stable id at the provider
    email: str
    full_name: str
    avatar_url: str = ""


@dataclass(frozen=True)
class Provider:
    key: str
    label: str
    authorize_url: str
    token_url: str
    userinfo_url: str
    scope: str
    parse: Callable[[dict], Profile]
    # Extra params for the authorize step (e.g. Google's consent/offline bits).
    authorize_extras: dict[str, str] = field(default_factory=dict)
    # Some providers (GitHub) only return JSON when asked to.
    token_headers: dict[str, str] = field(default_factory=dict)
    userinfo_params: dict[str, str] = field(default_factory=dict)
    # Brand colour used by the frontend button.
    brand: str = "#0f172a"

    @property
    def client_id(self) -> str:
        return getattr(settings, f"OAUTH_{self.key.upper()}_CLIENT_ID", "")

    @property
    def client_secret(self) -> str:
        return getattr(settings, f"OAUTH_{self.key.upper()}_CLIENT_SECRET", "")

    @property
    def enabled(self) -> bool:
        return bool(self.client_id and self.client_secret)


# ── Profile parsers ──────────────────────────────────────────────


def _google(data: dict) -> Profile:
    return Profile(
        subject=str(data.get("sub") or ""),
        email=(data.get("email") or "").lower(),
        full_name=data.get("name") or "",
        avatar_url=data.get("picture") or "",
    )


def _facebook(data: dict) -> Profile:
    picture = ((data.get("picture") or {}).get("data") or {}).get("url") or ""
    return Profile(
        subject=str(data.get("id") or ""),
        email=(data.get("email") or "").lower(),
        full_name=data.get("name") or "",
        avatar_url=picture,
    )


def _github(data: dict) -> Profile:
    return Profile(
        subject=str(data.get("id") or ""),
        email=(data.get("email") or "").lower(),
        full_name=data.get("name") or data.get("login") or "",
        avatar_url=data.get("avatar_url") or "",
    )


def _microsoft(data: dict) -> Profile:
    email = (data.get("mail") or data.get("userPrincipalName") or "").lower()
    return Profile(
        subject=str(data.get("id") or ""),
        email=email,
        full_name=data.get("displayName") or "",
    )


PROVIDERS: dict[str, Provider] = {
    p.key: p
    for p in [
        Provider(
            key="google",
            label="Google",
            authorize_url="https://accounts.google.com/o/oauth2/v2/auth",
            token_url="https://oauth2.googleapis.com/token",
            userinfo_url="https://openidconnect.googleapis.com/v1/userinfo",
            scope="openid email profile",
            parse=_google,
            authorize_extras={"prompt": "select_account"},
            brand="#ea4335",
        ),
        Provider(
            key="facebook",
            label="Facebook",
            authorize_url="https://www.facebook.com/v19.0/dialog/oauth",
            token_url="https://graph.facebook.com/v19.0/oauth/access_token",
            userinfo_url="https://graph.facebook.com/v19.0/me",
            scope="email,public_profile",
            parse=_facebook,
            userinfo_params={"fields": "id,name,email,picture.type(large)"},
            brand="#1877f2",
        ),
        Provider(
            key="github",
            label="GitHub",
            authorize_url="https://github.com/login/oauth/authorize",
            token_url="https://github.com/login/oauth/access_token",
            userinfo_url="https://api.github.com/user",
            scope="read:user user:email",
            parse=_github,
            token_headers={"Accept": "application/json"},
            brand="#24292f",
        ),
        Provider(
            key="microsoft",
            label="Microsoft",
            authorize_url="https://login.microsoftonline.com/common/oauth2/v2.0/authorize",
            token_url="https://login.microsoftonline.com/common/oauth2/v2.0/token",
            userinfo_url="https://graph.microsoft.com/v1.0/me",
            scope="openid email profile User.Read",
            parse=_microsoft,
            brand="#2f6feb",
        ),
    ]
}


def enabled_providers() -> list[Provider]:
    return [p for p in PROVIDERS.values() if p.enabled]


# ── State (signed, short-lived) ──────────────────────────────────


def make_state(provider: str, next_path: str, popup: bool) -> str:
    payload = {
        "p": provider,
        "n": next_path,
        "w": popup,
        "nonce": secrets.token_urlsafe(12),
        "exp": datetime.now(timezone.utc) + timedelta(minutes=STATE_TTL_MINUTES),
    }
    return jwt.encode(payload, settings.SECRET_KEY, algorithm=settings.ALGORITHM)


def read_state(state: str, provider: str) -> dict | None:
    try:
        payload = jwt.decode(state, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
    except JWTError:
        return None
    if payload.get("p") != provider:
        return None
    return payload


def safe_next(path: str | None) -> str:
    """Only same-site absolute paths — never an attacker-supplied origin."""
    if not path or not path.startswith("/") or path.startswith("//"):
        return "/services"
    return path


def callback_url(provider: str, public_base: str) -> str:
    """The redirect_uri registered with the provider.

    The browser reaches the backend through nginx under /api, so the public
    callback is `{origin}/api/errands/auth/oauth/{provider}/callback`.
    """
    base = (settings.OAUTH_PUBLIC_BASE_URL or public_base).rstrip("/")
    return f"{base}/api/errands/auth/oauth/{provider}/callback"


# ── Provider calls ───────────────────────────────────────────────


def authorize_redirect(provider: Provider, state: str, redirect_uri: str) -> str:
    params = {
        "client_id": provider.client_id,
        "redirect_uri": redirect_uri,
        "response_type": "code",
        "scope": provider.scope,
        "state": state,
        **provider.authorize_extras,
    }
    return f"{provider.authorize_url}?{urlencode(params)}"


def fetch_profile(provider: Provider, code: str, redirect_uri: str) -> Profile:
    """Exchange the code for an access token, then read the profile.

    Raises `OAuthError` with a human-readable reason; the router turns that
    into a redirect back to the login screen with an error message.
    """
    with httpx.Client(timeout=15.0, follow_redirects=True) as client:
        token_res = client.post(
            provider.token_url,
            data={
                "client_id": provider.client_id,
                "client_secret": provider.client_secret,
                "code": code,
                "redirect_uri": redirect_uri,
                "grant_type": "authorization_code",
            },
            headers={"Accept": "application/json", **provider.token_headers},
        )
        if token_res.status_code >= 400:
            raise OAuthError(f"{provider.label} rejected the sign-in")
        access_token = token_res.json().get("access_token")
        if not access_token:
            raise OAuthError(f"{provider.label} returned no access token")

        auth_header = {"Authorization": f"Bearer {access_token}"}
        params = dict(provider.userinfo_params)
        info_res = client.get(provider.userinfo_url, headers=auth_header, params=params)
        if info_res.status_code >= 400:
            raise OAuthError(f"Could not read your {provider.label} profile")
        profile = provider.parse(info_res.json())

        # GitHub hides addresses marked private on /user — ask explicitly.
        if provider.key == "github" and not profile.email:
            emails = client.get("https://api.github.com/user/emails", headers=auth_header)
            if emails.status_code < 400:
                primary = next(
                    (e for e in emails.json() if e.get("primary") and e.get("verified")),
                    None,
                )
                if primary:
                    profile = Profile(
                        subject=profile.subject,
                        email=str(primary.get("email", "")).lower(),
                        full_name=profile.full_name,
                        avatar_url=profile.avatar_url,
                    )

    if not profile.subject:
        raise OAuthError(f"{provider.label} did not identify the account")
    if not profile.email:
        raise OAuthError(
            f"Your {provider.label} account has no shareable email address. "
            "Add one there, or sign up with an email and password."
        )
    return profile


class OAuthError(Exception):
    """A recoverable social-login failure worth showing the user."""
