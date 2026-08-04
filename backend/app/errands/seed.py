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
from app.errands.core.db import SessionLocal
from app.errands.core.security import hash_password
from app.errands.models.service import QuoteMode, ServiceType
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
# Booking path per category (QuoteMode):
#   rooms  — homes: priced instantly from bed/bathroom count, booked online
#   unit   — per bin, per kg, per dispenser: priced by quantity, booked online
#   survey — offices, schools, hospitals, factories, hotels: no public price,
#            the customer books a free site survey and we quote after visiting
_HYGIENE_QUOTE_MODES = {
    "Commercial Cleaning": "survey",
    "Institutional Cleaning": "survey",
    "Healthcare Cleaning": "survey",
    "Industrial Cleaning": "survey",
    "Hospitality Cleaning": "survey",
    "Residential Cleaning": "rooms",
    "Sanitation & Washroom Hygiene": "unit",
    "Waste & Pest Control": "unit",
    "Laundry & Linen": "unit",
    "Subscriptions": "survey",
}

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
        mode = QuoteMode(_HYGIENE_QUOTE_MODES.get(cat, "survey"))
        existing = db.scalar(select(ServiceType).where(ServiceType.slug == slug))
        if existing:
            existing.vertical = "hygiene"
            existing.name = name
            existing.category = cat
            existing.icon = icon
            existing.description = _describe_hygiene(slug, name)
            existing.price_unit = unit
            existing.est_minutes = mins
            existing.goods_paid_separately = goods
            existing.sort_order = sort
            existing.quote_mode = mode
            continue
        db.add(
            ServiceType(
                slug=slug, name=name, vertical="hygiene", category=cat, icon=icon,
                description=_describe_hygiene(slug, name),
                base_price=price, price_unit=unit, est_minutes=mins,
                goods_paid_separately=goods, is_active=active, sort_order=sort,
                quote_mode=mode,
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


# One short, specific line per service. Deliberately not generated from the
# service name plus a shared category sentence: identical copy repeated down a
# list reads as filler and tells the customer nothing.
_HYGIENE_DESCRIPTIONS = {
    # Commercial
    "commercial-office-cleaning": "Desks, meeting rooms, kitchens and washrooms, cleaned around your working hours.",
    "retail-mall-cleaning": "Shop floors, fitting rooms and common areas kept presentable through trading hours.",
    "bank-branch-cleaning": "Banking halls, ATM lobbies and staff areas, cleaned before or after opening.",
    "office-deep-clean": "Periodic reset: carpets, upholstery, high-touch surfaces and full sanitisation.",
    # Residential
    "residential-housekeeping": "Regular clean of living areas, kitchen, bathrooms and floors. Products safe for children and pets.",
    "residential-deep-clean": "Top to bottom, including skirtings, inside appliances, tiles and grout.",
    "move-in-out-clean": "Empty-property clean so you get the deposit back or move into a spotless house.",
    "post-renovation-clean": "Dust, paint splatter and building debris removed so the place is liveable again.",
    # Institutional
    "school-cleaning": "Classrooms, halls, dormitories, labs and washrooms, scheduled around the timetable.",
    "worship-cleaning": "Sanctuaries, halls and ablution areas prepared between services and events.",
    "government-facility-cleaning": "Public offices, registries and service counters, cleaned to public-health standards.",
    # Healthcare
    "hospital-cleaning": "Wards, theatres and consultation rooms using hospital-grade disinfectants and infection-control protocols.",
    "lab-pharmacy-cleaning": "Controlled cleaning for labs, dispensaries and storage, with contamination protocols observed.",
    "infection-control-sanitization": "Targeted disinfection of high-contact surfaces after an outbreak or exposure.",
    # Industrial
    "warehouse-cleaning": "Racking, floors, loading bays and yards cleared of dust and spillage.",
    "factory-cleaning": "Grease, oil and production residue removed from machinery, floors and workspaces.",
    # Hospitality
    "hotel-housekeeping": "Guest rooms, corridors and public areas turned around between stays.",
    "restaurant-kitchen-cleaning": "Kitchens, extraction, cold rooms and dining areas cleaned to food-safety standards.",
    # Sanitation & washroom hygiene
    "sanitary-bucket-schools": "Scheduled collection and safe disposal for school washrooms, with each visit logged.",
    "sanitary-bin-offices": "Discreet bin servicing for office washrooms on a set collection round.",
    "sanitary-bin-rental": "Bins supplied, exchanged and maintained — no capital outlay.",
    "nappy-bin-service": "Hygienic nappy disposal for nurseries, clinics and family washrooms.",
    "washroom-hygiene": "Full washroom service: deep clean plus soap, tissue and liner restocking.",
    "sanitizer-dispenser": "Dispensers refilled, cleaned and kept working at entrances and washrooms.",
    "water-dispenser-clean": "Internal sanitisation of water dispensers, which are easily missed and easily contaminated.",
    # Waste & pest
    "waste-collection": "Scheduled waste collection and responsible disposal.",
    "fumigation": "Treatment for cockroaches, rodents, bedbugs and termites, with a follow-up visit.",
    # Laundry & linen
    "laundry-wash-fold": "Collected, washed, dried and folded, then returned on an agreed cycle.",
    "laundry-duvets": "Bulky bedding washed and dried properly — beyond a domestic machine.",
    "ironing-service": "Ironed and pressed, ready to wear or shelve.",
    "dry-cleaning": "Suits, dresses and delicate fabrics handled by garment type.",
    "linen-rental": "Linen supplied and laundered on rotation for hotels and offices.",
    # Coming soon
    "hygiene-subscription": "Coming soon — bundled monthly hygiene contracts for schools, offices and SMEs.",
}


def _describe_hygiene(slug: str, name: str) -> str:
    """Card copy for a hygiene service — one specific line, no boilerplate."""
    return _HYGIENE_DESCRIPTIONS.get(slug, name)


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
    # Apply schema changes before seeding. entrypoint.sh runs this module
    # before uvicorn boots, so the app's own startup migration hook has not
    # run yet — without this, the first deploy after any column is added
    # seeds against the old schema and silently skips.
    from app.errands.setup import init_errands_db

    init_errands_db()
    db = SessionLocal()
    try:
        seed_services(db)
        seed_users(db)
        print("✅ Seed complete: catalog + demo users ready.")
    finally:
        db.close()


if __name__ == "__main__":
    main()
