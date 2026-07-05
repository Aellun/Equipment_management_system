"""JWT helpers for staff/admin authentication.

Access tokens are short-lived (15 min) just-in-time sessions; refresh tokens
last several days and are only accepted by the /auth/refresh endpoint.
"""
from datetime import datetime, timedelta, timezone

from jose import JWTError, jwt

from app.config import settings

ACCESS_TYPE = "access"
REFRESH_TYPE = "refresh"


def _create_token(sub: str, role: str, token_type: str, expires: timedelta) -> str:
    now = datetime.now(timezone.utc)
    payload = {
        "sub": sub,
        "role": role,
        "type": token_type,
        "iat": now,
        "exp": now + expires,
    }
    return jwt.encode(payload, settings.secret_key, algorithm=settings.jwt_algorithm)


def create_access_token(user_id: int, role: str) -> str:
    return _create_token(
        str(user_id), role, ACCESS_TYPE,
        timedelta(minutes=settings.access_token_expire_minutes),
    )


def create_refresh_token(user_id: int, role: str) -> str:
    return _create_token(
        str(user_id), role, REFRESH_TYPE,
        timedelta(days=settings.refresh_token_expire_days),
    )


def decode_token(token: str, expected_type: str) -> dict | None:
    """Return the token payload if valid and of the expected type, else None."""
    try:
        payload = jwt.decode(token, settings.secret_key, algorithms=[settings.jwt_algorithm])
    except JWTError:
        return None
    if payload.get("type") != expected_type:
        return None
    return payload
