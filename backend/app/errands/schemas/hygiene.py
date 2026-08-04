"""Schemas for Dyzah Hygiene B2B supply enquiries.

Two deliberately different output shapes:
  * `EnquiryReceipt`  — what the public gets back after submitting. Reference
    and status only; it never echoes the contact details back over an
    unauthenticated response.
  * `EnquiryOut`      — the full record including contact PII. Only ever
    returned from admin-authenticated routes.
"""
from datetime import datetime

from pydantic import BaseModel, EmailStr, Field, field_validator

from app.errands.models.hygiene_enquiry import EnquiryStatus


class EnquiryCreate(BaseModel):
    organisation: str = Field(min_length=2, max_length=160)
    sector: str = Field(default="", max_length=60)
    county: str = Field(default="", max_length=60)
    contact_name: str = Field(min_length=2, max_length=120)
    contact_email: EmailStr | None = None
    contact_phone: str = Field(default="", max_length=30)
    products: str = Field(default="", max_length=300)
    estimated_quantity: str = Field(default="", max_length=80)
    frequency: str = Field(default="", max_length=60)
    notes: str = Field(default="", max_length=2000)

    @field_validator("contact_phone")
    @classmethod
    def _strip_phone(cls, v: str) -> str:
        return v.strip()


class EnquiryReceipt(BaseModel):
    """Public response — no PII echoed back."""

    reference: str
    status: EnquiryStatus


class EnquiryOut(BaseModel):
    """Admin-only view: includes prospective-client contact details."""

    id: int
    reference: str
    organisation: str
    sector: str
    county: str
    contact_name: str
    contact_email: str
    contact_phone: str
    products: str
    estimated_quantity: str
    frequency: str
    notes: str
    status: EnquiryStatus
    created_at: datetime

    class Config:
        from_attributes = True
