"""Dyzah Hygiene B2B supply enquiries (sanitary pads & hygiene products).

Institutional supply is quoted per tender, not sold at a public unit price,
so this pillar does not run through the catalog/STK-push booking flow. An
organisation submits an enquiry and the Dyzah Hygiene team follows up.

PRIVACY: rows hold prospective-client contact details and procurement intent.
Nothing here is served on a public endpoint — the list/detail routes are
admin-only, and the public status lookup returns a status string alone (see
routers/hygiene.py). Keep it that way when adding endpoints.
"""
import enum
from datetime import datetime

from sqlalchemy import DateTime, Enum, Integer, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column

from app.errands.core.db import Base


class EnquiryStatus(str, enum.Enum):
    new = "new"
    contacted = "contacted"
    quoted = "quoted"
    won = "won"
    closed = "closed"


class EnquiryKind(str, enum.Enum):
    """Both lead types land in one pipeline so the team works a single list."""

    # Hygiene products / sanitary pads for an institution.
    supply = "supply"
    # A free site survey before quoting a cleaning contract — offices,
    # schools, hospitals, factories, hotels.
    survey = "survey"


class HygieneEnquiry(Base):
    __tablename__ = "errand_hygiene_enquiries"

    id: Mapped[int] = mapped_column(primary_key=True)
    # Customer-facing handle, safe to share over email/phone: DH-XXXXXX.
    reference: Mapped[str] = mapped_column(String(20), unique=True, index=True)
    kind: Mapped[EnquiryKind] = mapped_column(
        Enum(EnquiryKind, name="errand_hygiene_enquiry_kind"),
        default=EnquiryKind.supply,
        index=True,
    )

    # ── Organisation ─────────────────────────────────────────────
    organisation: Mapped[str] = mapped_column(String(160))
    # School / county government / NGO / healthcare / corporate / …
    sector: Mapped[str] = mapped_column(String(60), default="")
    county: Mapped[str] = mapped_column(String(60), default="")

    # ── Contact (PII — admin-only, never returned publicly) ──────
    contact_name: Mapped[str] = mapped_column(String(120))
    contact_email: Mapped[str] = mapped_column(String(160), default="")
    contact_phone: Mapped[str] = mapped_column(String(30), default="")

    # ── Requirement ──────────────────────────────────────────────
    # `supply` leads fill in products/quantity; `survey` leads fill in the
    # site fields. Both share frequency and notes.
    products: Mapped[str] = mapped_column(String(300), default="")
    estimated_quantity: Mapped[str] = mapped_column(String(80), default="")
    site_type: Mapped[str] = mapped_column(String(80), default="")
    site_size: Mapped[str] = mapped_column(String(80), default="")
    locations: Mapped[str] = mapped_column(String(40), default="")
    frequency: Mapped[str] = mapped_column(String(60), default="")
    notes: Mapped[str] = mapped_column(Text, default="")

    status: Mapped[EnquiryStatus] = mapped_column(
        Enum(EnquiryStatus, name="errand_hygiene_enquiry_status"),
        default=EnquiryStatus.new,
        index=True,
    )
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
