"""Seed a realistic hire inventory for the Dyzah Events storefront.

Idempotent: units are keyed by serial number, so re-running tops a group up to
its target count rather than duplicating it.

Stock is serialised (one row per physical unit) because that is what check-out,
check-in and maintenance operate on. The storefront groups by name, so the
hire rate and listing copy are set identically across a group's units.
"""
import asyncio

from sqlalchemy import select

from app.database import AsyncSessionLocal
from app.models.equipment import Equipment, EquipmentStatus

# name, category, units, daily_rate KSh, description
CATALOG = [
    # ── Seating ───────────────────────────────────────────────
    ("Tiffany Chair", "Seating", 200, 120, "Gold-frame tiffany chair with a padded seat. Stacks for transport."),
    ("Plastic Banquet Chair", "Seating", 300, 50, "Hard-wearing stackable chair for large outdoor functions."),
    ("Chiavari Chair", "Seating", 120, 150, "Wooden chiavari with a cushioned pad — the standard wedding chair."),
    ("Sofa Set (3-seater)", "Seating", 12, 3500, "Upholstered lounge sofa for VIP and head-table areas."),
    # ── Tables ────────────────────────────────────────────────
    ("Round Table (10-seater)", "Tables", 60, 450, "1.8 m round banquet table seating ten comfortably."),
    ("Rectangular Trestle Table", "Tables", 80, 350, "1.8 m trestle for buffets, registration and gift tables."),
    ("Cocktail Table", "Tables", 40, 300, "Tall poseur table for standing receptions."),
    # ── Tents & structures ────────────────────────────────────
    ("Marquee Tent 10×20 m", "Tents & Structures", 6, 25000, "Frame marquee covering roughly 200 m², seats 200 guests."),
    ("Stretch Tent 10×15 m", "Tents & Structures", 4, 30000, "Free-form stretch canopy for garden and beach events."),
    ("Gazebo 3×3 m", "Tents & Structures", 25, 2500, "Pop-up gazebo for registration desks and food stalls."),
    ("Stage Deck 2×1 m", "Tents & Structures", 30, 1800, "Modular deck section, height-adjustable to 1 m."),
    # ── Audio ─────────────────────────────────────────────────
    ("PA Speaker (15\" active)", "Audio", 16, 3500, "Powered speaker with stand. Covers up to 300 guests as a pair."),
    ("Wireless Microphone", "Audio", 24, 1200, "Handheld UHF microphone with receiver and spare batteries."),
    ("Audio Mixer (12-channel)", "Audio", 8, 4000, "Twelve-channel desk with effects and phantom power."),
    ("Subwoofer (18\")", "Audio", 8, 5000, "Active subwoofer for dance floors and live bands."),
    # ── Lighting ──────────────────────────────────────────────
    ("LED Par Can", "Lighting", 48, 800, "RGBW uplighter for walls, tents and stage washes."),
    ("Moving Head Light", "Lighting", 16, 3000, "Motorised beam fixture for dance floors and stages."),
    ("Festoon Lighting (10 m)", "Lighting", 40, 1500, "Warm-white festoon string for canopies and walkways."),
    ("Follow Spot", "Lighting", 4, 6000, "Manual follow spot for entrances and first dances."),
    # ── Power & climate ───────────────────────────────────────
    ("Generator 10 kVA", "Power & Climate", 6, 12000, "Silent diesel generator, fuel supplied separately."),
    ("Patio Heater", "Power & Climate", 20, 2000, "Gas patio heater with cylinder for evening functions."),
    ("Industrial Fan", "Power & Climate", 24, 1500, "High-volume floor fan for tents and halls."),
    # ── Catering ──────────────────────────────────────────────
    ("Chafing Dish", "Catering", 60, 600, "Stainless chafing dish with fuel holders for buffet service."),
    ("Cutlery Set (per 10 covers)", "Catering", 100, 400, "Stainless cutlery, boxed per ten place settings."),
    ("Glassware Crate (per 25)", "Catering", 80, 500, "Crate of twenty-five tumblers or wine glasses."),
    ("Beverage Dispenser", "Catering", 30, 700, "Chilled dispenser for juice and water service."),
    # ── Decor ─────────────────────────────────────────────────
    ("Backdrop Frame 3×2.5 m", "Decor", 12, 3500, "Adjustable pipe-and-drape frame for photo walls and stages."),
    ("Red Carpet Runner (10 m)", "Decor", 10, 2500, "Ten-metre runner with edging for entrances."),
    ("Chair Cover & Sash", "Decor", 300, 60, "Stretch cover with a coloured organza sash."),
]


async def main() -> None:
    async with AsyncSessionLocal() as db:
        created = published = 0
        for name, category, target, rate, description in CATALOG:
            existing = (
                await db.execute(select(Equipment).where(Equipment.name == name))
            ).scalars().all()

            # Top the group up to its target count.
            prefix = "".join(w[0] for w in name.split()[:3]).upper()[:4] or "EQ"
            for i in range(len(existing), target):
                db.add(
                    Equipment(
                        name=name,
                        serial_number=f"{prefix}-{i + 1:04d}",
                        category=category,
                        status=EquipmentStatus.available,
                        daily_rate=rate,
                        description=description,
                        is_public=True,
                    )
                )
                created += 1

            # Keep listing details consistent across every unit in the group.
            for unit in existing:
                unit.daily_rate = rate
                unit.description = description
                unit.is_public = True
                published += 1

        await db.commit()
        print(f"✅ Events stock ready: {created} unit(s) created, {published} updated.")


if __name__ == "__main__":
    asyncio.run(main())
