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
# Sanitary collection for schools/offices, laundry, and related hygiene
# services. Same booking/escrow engine, just a different vertical.
# slug, name, category, icon, base_price, price_unit, est_min, goods_separate, active, sort
HYGIENE_CATALOG = [
    # ── Sanitary collection ───────────────────────────────────
    ("sanitary-bucket-schools", "Sanitary Bucket Collection — Schools", "Sanitary Collection", "🪣", 1500, "per collection", 120, False, True, 10),
    ("sanitary-bin-offices", "Sanitary Bin Service — Corporate Offices", "Sanitary Collection", "🚮", 1200, "per service", 90, False, True, 11),
    ("sanitary-bin-rental", "Sanitary Bin Rental & Exchange", "Sanitary Collection", "♻️", 800, "per unit / month", 60, False, True, 12),
    ("nappy-bin-service", "Nappy / Diaper Bin Service", "Sanitary Collection", "🧷", 1000, "per service", 75, False, True, 13),
    # ── Laundry & linen ───────────────────────────────────────
    ("laundry-wash-fold", "Laundry — Wash & Fold", "Laundry & Linen", "🧺", 200, "per kg", 1440, False, True, 20),
    ("laundry-duvets", "Duvets & Beddings Laundry", "Laundry & Linen", "🛏️", 700, "per item", 1440, False, True, 21),
    ("ironing-service", "Ironing & Pressing Service", "Laundry & Linen", "👔", 150, "per kg", 720, False, True, 22),
    ("dry-cleaning", "Dry Cleaning", "Laundry & Linen", "🧥", 500, "per garment", 1440, False, True, 23),
    ("linen-rental", "Hotel / Office Linen Rental & Laundry", "Laundry & Linen", "🏨", 2500, "per cycle", 1440, False, True, 24),
    # ── Cleaning & sanitization ───────────────────────────────
    ("office-deep-clean", "Office Deep Cleaning & Sanitization", "Cleaning & Sanitization", "🧼", 3500, "per session", 240, False, True, 30),
    ("washroom-hygiene", "Washroom Hygiene & Dispenser Refill", "Cleaning & Sanitization", "🚻", 1800, "per service", 120, False, True, 31),
    ("water-dispenser-clean", "Water Dispenser Sanitization", "Cleaning & Sanitization", "🚰", 900, "per unit", 60, False, True, 32),
    ("sanitizer-dispenser", "Hand Sanitizer Dispenser Servicing", "Cleaning & Sanitization", "🧴", 600, "per unit / month", 45, False, True, 33),
    # ── Waste & pest ──────────────────────────────────────────
    ("waste-collection", "Waste & Disposal Collection", "Waste & Pest Control", "🗑️", 1500, "per collection", 90, False, True, 40),
    ("fumigation", "Fumigation / Pest Control", "Waste & Pest Control", "🐜", 4000, "per treatment", 180, False, True, 41),
    # ── Coming soon ───────────────────────────────────────────
    ("hygiene-subscription", "Monthly Hygiene Subscription (Schools & SMEs)", "Subscriptions", "📅", 0, "coming soon", 0, False, False, 50),
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
    for (slug, name, cat, icon, price, unit, mins, goods, active, sort) in HYGIENE_CATALOG:
        existing = db.scalar(select(ServiceType).where(ServiceType.slug == slug))
        if existing:
            continue
        db.add(
            ServiceType(
                slug=slug, name=name, vertical="hygiene", category=cat, icon=icon,
                description=_describe_hygiene(name, cat),
                base_price=price, price_unit=unit, est_minutes=mins,
                goods_paid_separately=goods, is_active=active, sort_order=sort,
            )
        )
    db.commit()


def _describe_hygiene(name: str, category: str) -> str:
    if category == "Subscriptions":
        return "Coming soon — bundled monthly hygiene plans for schools, offices and SMEs."
    return f"{name} — scheduled pickup/service by a verified Dyzah Hygiene crew, with proof and M-Pesa escrow."


def _describe(name: str, category: str) -> str:
    if category == "Students & Scholarships":
        return "Coming soon — help with HELB, bursaries and scholarship applications."
    if category == "Jobs & Careers":
        return "Coming soon — professional CV writing and job application support."
    if category == "Corporate":
        return "Coming soon — monthly retainer errands for offices and SMEs."
    return f"{name} handled by a verified runner with photo proof and M-Pesa escrow."


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
