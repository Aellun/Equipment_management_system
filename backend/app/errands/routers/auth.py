from urllib.parse import urlencode

from fastapi import APIRouter, Depends, HTTPException, Request, status
from fastapi.responses import RedirectResponse
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.errands.core import oauth
from app.errands.core.db import get_db
from app.errands.core.deps import get_current_user
from app.errands.core.security import create_access_token, hash_password, verify_password
from app.errands.models.oauth_account import OAuthAccount
from app.errands.models.user import RunnerProfile, User, UserRole
from app.errands.schemas.auth import (
    LoginRequest,
    ProviderOut,
    RegisterRequest,
    TokenResponse,
    UserOut,
)

router = APIRouter(prefix="/errands/auth", tags=["errands:auth"])

# Where the browser lands after a social sign-in; the page reads the token out
# of the URL fragment (fragments never reach a server or a proxy log).
OAUTH_LANDING = "/services/auth/callback"


def _token_response(user: User) -> TokenResponse:
    token = create_access_token(subject=str(user.id), role=user.role.value)
    return TokenResponse(access_token=token, user=UserOut.model_validate(user))


@router.post("/register", response_model=TokenResponse, status_code=201)
def register(body: RegisterRequest, db: Session = Depends(get_db)):
    if db.scalar(select(User).where(User.email == body.email)):
        raise HTTPException(status_code=400, detail="Email already registered")
    if body.role == UserRole.admin:
        raise HTTPException(status_code=403, detail="Cannot self-register as admin")

    user = User(
        full_name=body.full_name,
        email=body.email,
        phone=body.phone,
        hashed_password=hash_password(body.password),
        role=body.role,
    )
    db.add(user)
    db.flush()

    if body.role == UserRole.runner:
        db.add(
            RunnerProfile(
                user_id=user.id,
                suburb=body.suburb or "Nairobi CBD",
                skills=body.skills or "",
            )
        )
    db.commit()
    db.refresh(user)
    return _token_response(user)


@router.post("/login", response_model=TokenResponse)
def login(body: LoginRequest, db: Session = Depends(get_db)):
    user = db.scalar(select(User).where(User.email == body.email))
    if not user or not verify_password(body.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials"
        )
    return _token_response(user)


@router.post("/token", response_model=TokenResponse, include_in_schema=False)
def login_form(
    form: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)
):
    """OAuth2 form login so Swagger's Authorize button works."""
    user = db.scalar(select(User).where(User.email == form.username))
    if not user or not verify_password(form.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    return _token_response(user)


@router.get("/me", response_model=UserOut)
def me(user: User = Depends(get_current_user)):
    return user


# ── Social login ─────────────────────────────────────────────────


def _public_base(request: Request) -> str:
    """Origin the browser used, as seen behind nginx."""
    proto = request.headers.get("x-forwarded-proto") or request.url.scheme
    host = request.headers.get("x-forwarded-host") or request.headers.get("host") or request.url.netloc
    return f"{proto}://{host}"


def _landing(base: str, params: dict[str, str]) -> RedirectResponse:
    """Back to the frontend with the result in the URL fragment."""
    return RedirectResponse(f"{base}{OAUTH_LANDING}#{urlencode(params)}", status_code=302)


@router.get("/providers", response_model=list[ProviderOut])
def providers():
    """Every social provider, flagged with whether its credentials are set."""
    return [
        ProviderOut(key=p.key, label=p.label, brand=p.brand, configured=p.enabled)
        for p in oauth.PROVIDERS.values()
    ]


@router.get("/oauth/{provider_key}/start")
def oauth_start(
    provider_key: str,
    request: Request,
    next: str = "/services",
    popup: bool = False,
):
    provider = oauth.PROVIDERS.get(provider_key)
    if not provider or not provider.enabled:
        raise HTTPException(status_code=404, detail="Sign-in provider not available")
    redirect_uri = oauth.callback_url(provider.key, _public_base(request))
    state = oauth.make_state(provider.key, oauth.safe_next(next), popup)
    return RedirectResponse(oauth.authorize_redirect(provider, state, redirect_uri), status_code=302)


@router.get("/oauth/{provider_key}/callback")
def oauth_callback(
    provider_key: str,
    request: Request,
    code: str | None = None,
    state: str | None = None,
    error: str | None = None,
    db: Session = Depends(get_db),
):
    base = _public_base(request)
    provider = oauth.PROVIDERS.get(provider_key)
    if not provider or not provider.enabled:
        return _landing(base, {"error": "That sign-in method is not available."})

    claims = oauth.read_state(state or "", provider.key)
    if not claims:
        return _landing(base, {"error": "Sign-in expired or was tampered with. Please try again."})
    result = {"next": oauth.safe_next(claims.get("n")), "popup": "1" if claims.get("w") else "0"}

    if error or not code:
        return _landing(base, {**result, "error": f"{provider.label} sign-in was cancelled."})

    try:
        profile = oauth.fetch_profile(provider, code, oauth.callback_url(provider.key, base))
    except oauth.OAuthError as exc:
        return _landing(base, {**result, "error": str(exc)})
    except Exception:  # network/provider outage — never leak internals
        return _landing(base, {**result, "error": f"Could not reach {provider.label}. Try again."})

    user = _link_or_create(db, provider.key, profile)
    if not user.is_active:
        return _landing(base, {**result, "error": "This account has been disabled."})

    token = create_access_token(subject=str(user.id), role=user.role.value)
    return _landing(base, {**result, "token": token, "role": user.role.value})


def _link_or_create(db: Session, provider_key: str, profile: oauth.Profile) -> User:
    """Match the identity to an account, linking or creating one as needed."""
    link = db.scalar(
        select(OAuthAccount).where(
            OAuthAccount.provider == provider_key,
            OAuthAccount.provider_account_id == profile.subject,
        )
    )
    if link:
        user = db.get(User, link.user_id)
        if user:
            # Keep the display details fresh on every sign-in.
            link.email = profile.email
            link.avatar_url = profile.avatar_url
            if profile.avatar_url:
                user.avatar_url = profile.avatar_url
            db.commit()
            db.refresh(user)
            return user

    user = db.scalar(select(User).where(User.email == profile.email))
    if not user:
        # Social sign-ups are customers; runners still apply through the form
        # so the vetting fields (suburb, skills, ID) are captured up front.
        user = User(
            full_name=profile.full_name or profile.email.split("@")[0],
            email=profile.email,
            phone="",
            hashed_password="",
            role=UserRole.customer,
            avatar_url=profile.avatar_url,
        )
        db.add(user)
        db.flush()

    db.add(
        OAuthAccount(
            user_id=user.id,
            provider=provider_key,
            provider_account_id=profile.subject,
            email=profile.email,
            avatar_url=profile.avatar_url,
        )
    )
    db.commit()
    db.refresh(user)
    return user
