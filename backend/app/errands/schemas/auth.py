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

    class Config:
        from_attributes = True


TokenResponse.model_rebuild()
