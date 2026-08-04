"""Dyzah Hygiene — B2B hygiene product & sanitary pad supply enquiries.

The cleaning side of Dyzah Hygiene books through the shared catalog flow
(`/errands/services` + `/errands/tasks` with vertical="hygiene"). Institutional
product supply is different: quantities and pricing are negotiated per tender,
so organisations submit an enquiry here and the team follows up off-platform.

PRIVACY: submissions contain prospective-client contact details. Only the two
admin routes return them. The public routes accept a submission and report a
status by reference — neither reads back any contact field.
"""
import secrets

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import desc, select
from sqlalchemy.orm import Session

from app.errands.core.db import get_db
from app.errands.core.deps import require_role
from app.errands.core.tasks import notify
from app.errands.models.hygiene_enquiry import EnquiryStatus, HygieneEnquiry
from app.errands.models.user import UserRole
from app.errands.schemas.hygiene import EnquiryCreate, EnquiryOut, EnquiryReceipt

router = APIRouter(prefix="/errands/hygiene", tags=["errands:hygiene"])


def _make_reference() -> str:
    return "DH-" + secrets.token_hex(3).upper()


# ── Public ───────────────────────────────────────────────────────
@router.post("/enquiries", response_model=EnquiryReceipt, status_code=201)
def create_enquiry(body: EnquiryCreate, db: Session = Depends(get_db)):
    """Submit a supply enquiry. Public — organisations have no account yet."""
    if not body.contact_email and not body.contact_phone:
        raise HTTPException(
            status_code=400,
            detail="Provide at least one way to reach you — an email address or a phone number.",
        )
    enquiry = HygieneEnquiry(
        reference=_make_reference(),
        organisation=body.organisation.strip(),
        sector=body.sector.strip(),
        county=body.county.strip(),
        contact_name=body.contact_name.strip(),
        contact_email=str(body.contact_email or ""),
        contact_phone=body.contact_phone,
        products=body.products.strip(),
        estimated_quantity=body.estimated_quantity.strip(),
        frequency=body.frequency.strip(),
        notes=body.notes.strip(),
    )
    db.add(enquiry)
    db.commit()
    db.refresh(enquiry)
    # Notify by reference only — no contact details in the message body.
    notify("email", "admin", f"New Dyzah Hygiene supply enquiry {enquiry.reference}")
    return EnquiryReceipt(reference=enquiry.reference, status=enquiry.status)


@router.get("/enquiries/{reference}/status", response_model=EnquiryReceipt)
def enquiry_status(reference: str, db: Session = Depends(get_db)):
    """Status lookup by reference. Returns the status only — never the PII."""
    enquiry = db.scalar(
        select(HygieneEnquiry).where(HygieneEnquiry.reference == reference.upper())
    )
    if not enquiry:
        raise HTTPException(status_code=404, detail="Enquiry not found")
    return EnquiryReceipt(reference=enquiry.reference, status=enquiry.status)


# ── Admin ────────────────────────────────────────────────────────
@router.get(
    "/admin/enquiries",
    response_model=list[EnquiryOut],
    dependencies=[Depends(require_role(UserRole.admin))],
)
def list_enquiries(status: EnquiryStatus | None = None, db: Session = Depends(get_db)):
    stmt = select(HygieneEnquiry).order_by(desc(HygieneEnquiry.created_at))
    if status:
        stmt = stmt.where(HygieneEnquiry.status == status)
    return db.scalars(stmt).all()


@router.post(
    "/admin/enquiries/{enquiry_id}/status",
    response_model=EnquiryOut,
    dependencies=[Depends(require_role(UserRole.admin))],
)
def set_enquiry_status(
    enquiry_id: int, status: EnquiryStatus, db: Session = Depends(get_db)
):
    enquiry = db.get(HygieneEnquiry, enquiry_id)
    if not enquiry:
        raise HTTPException(status_code=404, detail="Enquiry not found")
    enquiry.status = status
    db.commit()
    db.refresh(enquiry)
    return enquiry
