from pydantic import BaseModel, EmailStr, Field

from app.errands.models.user import UserRole


class RegisterRequest(BaseModel):
    full_name: str = Field(min_length=2, max_length=120)
    email: EmailStr
    phone: str = Field(min_length=9, max_length=20)
    password: str = Field(min_length=6, max_length=128)
    role: UserRole = UserRole.customer
    # Runner-only optional fields
    suburb: str | None = None
    skills: str | None = None


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: "UserOut"


class UserOut(BaseModel):
    id: int
    full_name: str
    email: EmailStr
    phone: str
    role: UserRole
    avatar_url: str = ""

    class Config:
        from_attributes = True


class ProviderOut(BaseModel):
    """A social sign-in option, and whether this deployment can actually use it.

    Every provider is listed so the sign-in screens show the full set; the
    frontend marks the ones without credentials as unavailable rather than
    letting a customer dead-end at the provider.
    """

    key: str
    label: str
    brand: str
    configured: bool


TokenResponse.model_rebuild()
