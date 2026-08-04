"""Idempotent seed: Nairobi service catalog + demo users.

Run automatically on container startup. Safe to run repeatedly.

Catalog reflects the competitive strategy:
  - Core errands priced TRANSPARENTLY (vs hidden-price competitors)
  - A "Government & Bureaucracy" category = our moat vs Glovo/Bolt
  - Diaspora category
  - Future verticals (students, jobs, corporate) seeded as is_active=False
    "coming soon" so the catalog model is proven without schema churn.
"""
from sqlalchemy import select

from app.errands.core.config import settings
from app.errands.core.db import Base, SessionLocal, engine
from app.errands.core.security import hash_password
from app.errands.models.service import ServiceType
from app.errands.models.user import RunnerProfile, User, UserRole, VerificationStatus

# slug, name, category, icon, base_price, price_unit, est_min, goods_separate, active, sort
CATALOG = [
    # ── Everyday errands ──────────────────────────────────────
    ("parcel-delivery", "Parcel Pickup & Delivery", "Everyday Errands", "📦", 250, "per trip", 60, False, True, 10),
    ("grocery-shopping", "Grocery Shopping & Delivery", "Everyday Errands", "🛒", 350, "service fee", 90, True, True, 11),
    ("pharmacy-run", "Pharmacy / Prescription Run", "Everyday Errands", "💊", 300, "service fee", 60, True, True, 12),
    ("laundry", "Laundry Pickup & Drop-off", "Everyday Errands", "🧺", 300, "per trip", 75, False, True, 13),
    ("gift-delivery", "Gift Shopping & Delivery", "Everyday Errands", "🎁", 400, "service fee", 90, True, True, 14),
    ("market-sourcing", "Gikomba / Market Sourcing", "Everyday Errands", "🛍️", 500, "service fee", 120, True, True, 15),
    # ── Banking & documents ──────────────────────────────────
    ("bank-run", "Bank / Cheque Deposit Run", "Banking & Documents", "🏦", 450, "per trip", 90, False, True, 20),
    ("document-courier", "Confidential Document Courier", "Banking & Documents", "📄", 350, "per trip", 60, False, True, 21),
    # ── Government & bureaucracy (our moat) ──────────────────
    ("huduma-queue", "Huduma / eCitizen Queue Standing", "Government & Bureaucracy", "🏛️", 800, "per visit", 180, False, True, 30),
    ("ntsa-plates", "NTSA / Number Plate Collection", "Government & Bureaucracy", "🚗", 700, "per visit", 150, False, True, 31),
    ("passport-docs", "Passport / Visa Document Run", "Government & Bureaucracy", "🛂", 900, "per visit", 180, False, True, 32),
    # ── Diaspora ─────────────────────────────────────────────
    ("property-check", "Property / Airbnb Check-in", "Diaspora Support", "🏠", 1500, "per visit", 120, False, True, 40),
    ("bill-payment", "Bill Payment & Receipts", "Diaspora Support", "🧾", 400, "service fee", 45, True, True, 41),
    ("hospital-checkin", "Hospital / Family Check-in", "Diaspora Support", "🏥", 1200, "per visit", 120, False, True, 42),
    # ── Coming-soon verticals (catalog proves the model) ─────
    ("scholarship-help", "Scholarship & HELB Application Help", "Students & Scholarships", "🎓", 0, "coming soon", 0, False, False, 50),
    ("cv-jobs", "CV Writing & Job Applications", "Jobs & Careers", "💼", 0, "coming soon", 0, False, False, 51),
    ("corporate-retainer", "Corporate Errand Retainer", "Corporate", "🏢", 0, "coming soon", 0, False, False, 52),
]

# ── Dyzah Hygiene catalog (vertical="hygiene") ───────────────────
# Dyzah Hygiene is its own business (own site at /hygiene, own brand), but
# runs on the shared booking/pricing/assignment/payment engine — it is just
# a different `vertical`. Categories mirror the service lines in the company
# profile: commercial, residential, institutional, healthcare, industrial and
# hospitality cleaning, plus sanitation/washroom hygiene and waste control.
#
# The second pillar (hygiene products & sanitary pad distribution) is NOT in
# this catalog: institutional supply is quoted per tender, not sold at a
# public unit price. It runs through the enquiry flow instead — see
# app.errands.models.hygiene_enquiry.
#
# Prices are indicative "from" rates for a standard site; anything larger is
# re-quoted after a site visit.
# slug, name, category, icon, base_price, price_unit, est_min, goods_separate, active, sort
HYGIENE_CATALOG = [
    # ── Commercial cleaning ───────────────────────────────────
    ("commercial-office-cleaning", "Office & Corporate Cleaning", "Commercial Cleaning", "🏢", 4500, "per session (from)", 240, False, True, 10),
    ("retail-mall-cleaning", "Retail, Mall & Showroom Cleaning", "Commercial Cleaning", "🛍️", 5500, "per session (from)", 300, False, True, 11),
    ("bank-branch-cleaning", "Bank & Financial Branch Cleaning", "Commercial Cleaning", "🏦", 5000, "per session (from)", 240, False, True, 12),
    ("office-deep-clean", "Office Deep Cleaning & Sanitisation", "Commercial Cleaning", "🧼", 3500, "per session (from)", 240, False, True, 13),
    # ── Residential cleaning ──────────────────────────────────
    ("residential-housekeeping", "Routine Housekeeping", "Residential Cleaning", "🏠", 2500, "per visit (from)", 180, False, True, 20),
    ("residential-deep-clean", "Deep & Spring Cleaning", "Residential Cleaning", "✨", 6000, "per session (from)", 360, False, True, 21),
    ("move-in-out-clean", "Move-In / Move-Out Cleaning", "Residential Cleaning", "📦", 7000, "per session (from)", 420, False, True, 22),
    ("post-renovation-clean", "Post-Construction & Post-Renovation Cleaning", "Residential Cleaning", "🧱", 9000, "per session (from)", 480, False, True, 23),
    # ── Institutional cleaning ────────────────────────────────
    ("school-cleaning", "School, College & University Cleaning", "Institutional Cleaning", "🎓", 8000, "per session (from)", 480, False, True, 30),
    ("worship-cleaning", "Places of Worship & Community Centres", "Institutional Cleaning", "🕌", 4500, "per session (from)", 240, False, True, 31),
    ("government-facility-cleaning", "Government & Public Office Cleaning", "Institutional Cleaning", "🏛️", 6500, "per session (from)", 360, False, True, 32),
    # ── Healthcare cleaning ───────────────────────────────────
    ("hospital-cleaning", "Hospital, Clinic & Dental Cleaning", "Healthcare Cleaning", "🏥", 9500, "per session (from)", 480, False, True, 40),
    ("lab-pharmacy-cleaning", "Laboratory & Pharmacy Cleaning", "Healthcare Cleaning", "🔬", 7500, "per session (from)", 300, False, True, 41),
    ("infection-control-sanitization", "Infection Control & Surface Disinfection", "Healthcare Cleaning", "🦠", 6000, "per treatment (from)", 240, False, True, 42),
    # ── Industrial cleaning ───────────────────────────────────
    ("warehouse-cleaning", "Warehouse & Distribution Centre Cleaning", "Industrial Cleaning", "📦", 12000, "per session (from)", 600, False, True, 50),
    ("factory-cleaning", "Manufacturing & Production Plant Cleaning", "Industrial Cleaning", "🏭", 15000, "per session (from)", 600, False, True, 51),
    # ── Hospitality cleaning ──────────────────────────────────
    ("hotel-housekeeping", "Guest Room & Housekeeping Support", "Hospitality Cleaning", "🛏️", 6500, "per session (from)", 360, False, True, 60),
    ("restaurant-kitchen-cleaning", "Restaurant & Commercial Kitchen Cleaning", "Hospitality Cleaning", "🍽️", 7000, "per session (from)", 300, False, True, 61),
    # ── Sanitation & washroom hygiene ─────────────────────────
    ("sanitary-bucket-schools", "Sanitary Bucket Collection — Schools", "Sanitation & Washroom Hygiene", "🪣", 1500, "per collection", 120, False, True, 70),
    ("sanitary-bin-offices", "Sanitary Bin Service — Corporate Offices", "Sanitation & Washroom Hygiene", "🚮", 1200, "per service", 90, False, True, 71),
    ("sanitary-bin-rental", "Sanitary Bin Rental & Exchange", "Sanitation & Washroom Hygiene", "♻️", 800, "per unit / month", 60, False, True, 72),
    ("nappy-bin-service", "Nappy / Diaper Bin Service", "Sanitation & Washroom Hygiene", "🧷", 1000, "per service", 75, False, True, 73),
    ("washroom-hygiene", "Washroom Hygiene & Dispenser Refill", "Sanitation & Washroom Hygiene", "🚻", 1800, "per service", 120, False, True, 74),
    ("sanitizer-dispenser", "Hand Sanitiser Dispenser Servicing", "Sanitation & Washroom Hygiene", "🧴", 600, "per unit / month", 45, False, True, 75),
    ("water-dispenser-clean", "Water Dispenser Sanitisation", "Sanitation & Washroom Hygiene", "🚰", 900, "per unit", 60, False, True, 76),
    # ── Waste & pest control ──────────────────────────────────
    ("waste-collection", "Waste & Disposal Collection", "Waste & Pest Control", "🗑️", 1500, "per collection", 90, False, True, 80),
    ("fumigation", "Fumigation & Pest Control", "Waste & Pest Control", "🐜", 4000, "per treatment", 180, False, True, 81),
    # ── Laundry & linen ───────────────────────────────────────
    ("laundry-wash-fold", "Laundry — Wash & Fold", "Laundry & Linen", "🧺", 200, "per kg", 1440, False, True, 90),
    ("laundry-duvets", "Duvets & Beddings Laundry", "Laundry & Linen", "🛏️", 700, "per item", 1440, False, True, 91),
    ("ironing-service", "Ironing & Pressing Service", "Laundry & Linen", "👔", 150, "per kg", 720, False, True, 92),
    ("dry-cleaning", "Dry Cleaning", "Laundry & Linen", "🧥", 500, "per garment", 1440, False, True, 93),
    ("linen-rental", "Hotel / Office Linen Rental & Laundry", "Laundry & Linen", "🏨", 2500, "per cycle", 1440, False, True, 94),
    # ── Coming soon ───────────────────────────────────────────
    ("hygiene-subscription", "Monthly Hygiene Contract (Schools & SMEs)", "Subscriptions", "📅", 0, "coming soon", 0, False, False, 100),
]


def seed_services(db) -> None:
    for (slug, name, cat, icon, price, unit, mins, goods, active, sort) in CATALOG:
        existing = db.scalar(select(ServiceType).where(ServiceType.slug == slug))
        if existing:
            continue
        db.add(
            ServiceType(
                slug=slug, name=name, vertical="errands", category=cat, icon=icon,
                description=_describe(name, cat),
                base_price=price, price_unit=unit, est_minutes=mins,
                goods_paid_separately=goods, is_active=active, sort_order=sort,
            )
        )
    # Hygiene rows are upserted rather than insert-only: the catalog was re-cut
    # to match the Dyzah Hygiene company profile, and databases seeded before
    # that still hold the old names and categories.
    #
    # Only the catalog *definition* is refreshed. `base_price` and `is_active`
    # belong to whoever runs the business — they are editable from the ops
    # console, and the seed runs on every container start, so overwriting them
    # would silently revert admin changes on the next restart.
    for (slug, name, cat, icon, price, unit, mins, goods, active, sort) in HYGIENE_CATALOG:
        existing = db.scalar(select(ServiceType).where(ServiceType.slug == slug))
        if existing:
            existing.vertical = "hygiene"
            existing.name = name
            existing.category = cat
            existing.icon = icon
            existing.description = _describe_hygiene(name, cat)
            existing.price_unit = unit
            existing.est_minutes = mins
            existing.goods_paid_separately = goods
            existing.sort_order = sort
            continue
        db.add(
            ServiceType(
                slug=slug, name=name, vertical="hygiene", category=cat, icon=icon,
                description=_describe_hygiene(name, cat),
                base_price=price, price_unit=unit, est_minutes=mins,
                goods_paid_separately=goods, is_active=active, sort_order=sort,
            )
        )
    # Retire hygiene services dropped from the catalog. Deactivate rather than
    # delete — historical tasks still point at these rows.
    live_slugs = {row[0] for row in HYGIENE_CATALOG}
    stale = db.scalars(
        select(ServiceType).where(
            ServiceType.vertical == "hygiene", ServiceType.slug.notin_(live_slugs)
        )
    ).all()
    for svc in stale:
        svc.is_active = False
    db.commit()


_HYGIENE_BLURBS = {
    "Commercial Cleaning": "Flexible daily, weekly or monthly schedules that minimise disruption to business operations.",
    "Residential Cleaning": "Safe for children, pets and household surfaces — living areas, kitchens, bathrooms, balconies and outdoor spaces.",
    "Institutional Cleaning": "Classrooms, halls, offices, libraries, restrooms and recreational areas kept to public-health standards.",
    "Healthcare Cleaning": "Hospital-grade disinfectants and recognised infection-prevention protocols on every high-contact surface.",
    "Industrial Cleaning": "Industrial-grade equipment for dust, grease, oil and production residue across floors, machinery and loading bays.",
    "Hospitality Cleaning": "Discreet, consistent service that keeps guest-facing spaces welcoming and hygienic.",
    "Sanitation & Washroom Hygiene": "Scheduled servicing with responsible disposal and restocking, logged on every visit.",
    "Waste & Pest Control": "Responsible collection and treatment that meets health and safety requirements.",
    "Laundry & Linen": "Collected, cleaned and returned on an agreed cycle.",
}


def _describe_hygiene(name: str, category: str) -> str:
    """Card copy for a hygiene service.

    The service name is already the card heading, so the description carries
    only what the name does not: what the category actually covers, and the
    delivery promise."""
    if category == "Subscriptions":
        return "Coming soon — bundled monthly hygiene contracts for schools, offices and SMEs."
    blurb = _HYGIENE_BLURBS.get(category, "")
    return f"{blurb} Delivered by a trained, vetted Dyzah Hygiene crew, with photo proof on completion.".strip()


def _describe(name: str, category: str) -> str:
    if category == "Students & Scholarships":
        return "Coming soon — help with HELB, bursaries and scholarship applications."
    if category == "Jobs & Careers":
        return "Coming soon — professional CV writing and job application support."
    if category == "Corporate":
        return "Coming soon — monthly retainer errands for offices and SMEs."
    return f"{name} handled by a verified runner with photo proof and secure M-Pesa payment."


def _ensure_user(db, *, email, name, phone, password, role) -> User:
    user = db.scalar(select(User).where(User.email == email))
    if user:
        return user
    user = User(
        full_name=name, email=email, phone=phone,
        hashed_password=hash_password(password), role=role,
    )
    db.add(user)
    db.flush()
    return user


def seed_users(db) -> None:
    # Unified admin: same credentials as the main staff admin, so one login
    # covers the whole platform (the admin Services console auto-connects with
    # these). Keep the dyzah errands-admin too as a fallback.
    _ensure_user(
        db, email="admin@fabent.com", name="Dyzah Admin",
        phone="254700000001", password="Admin2024", role=UserRole.admin,
    )
    _ensure_user(
        db, email=settings.SEED_ADMIN_EMAIL, name="Dyzah Errands Admin",
        phone="254700000000", password=settings.SEED_ADMIN_PASSWORD, role=UserRole.admin,
    )
    _ensure_user(
        db, email="customer@demo.co.ke", name="Demo Customer",
        phone="254712345678", password=settings.SEED_DEMO_PASSWORD, role=UserRole.customer,
    )

    runners = [
        ("runner@demo.co.ke", "Brian Otieno", "254711111111", "Westlands", "shopping,delivery,banking", 4.8, 31),
        ("grace@demo.co.ke", "Grace Wanjiru", "254722222222", "Kilimani", "documents,government,diaspora", 4.9, 52),
        ("kevin@demo.co.ke", "Kevin Mwangi", "254733333333", "Embakasi", "delivery,market,pharmacy", 4.6, 18),
    ]
    for email, name, phone, suburb, skills, rating, done in runners:
        u = _ensure_user(
            db, email=email, name=name, phone=phone,
            password=settings.SEED_DEMO_PASSWORD, role=UserRole.runner,
        )
        if not u.runner_profile:
            db.add(
                RunnerProfile(
                    user_id=u.id, suburb=suburb, skills=skills,
                    bio=f"Reliable Nairobi runner based in {suburb}.",
                    verification_status=VerificationStatus.verified,
                    is_available=True, rating_avg=rating, rating_count=done,
                    completed_tasks=done,
                )
            )
    db.commit()


def main() -> None:
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        seed_services(db)
        seed_users(db)
        print("✅ Seed complete: catalog + demo users ready.")
    finally:
        db.close()


if __name__ == "__main__":
    main()
