"""Seed the storefront with a multi-department catalog.

Idempotent: departments/categories are matched by name, products are skipped
if a product with the same name already exists. Also removes exact-name
duplicate products left over from testing (keeps the oldest copy).

Run inside the backend container:
    docker compose exec backend python -m app.seed_shop
"""
import asyncio
from collections import defaultdict

from sqlalchemy import select

from app.database import AsyncSessionLocal
from app.models.product import Product
from app.models.department import Department
from app.models.shop_category import ShopCategory
from app.schemas.product import ProductCreate, VariantCreate
from app.schemas.department import DepartmentCreate
from app.crud import product as product_crud
from app.crud import department as department_crud
from app.crud.slug import unique_slug

U = "https://images.unsplash.com"


def img(photo_id: str) -> str:
    return f"{U}/photo-{photo_id}?w=900&q=80&auto=format&fit=crop"


DEPARTMENTS = [
    {"name": "Kitchenware", "icon": "🍳", "tagline": "Quality cookware & kitchen essentials",
     "attribute_labels": ["Size", "Capacity", "Material", "Colour"], "sort_order": 1},
    {"name": "Clothing", "icon": "👕", "tagline": "Fashion & apparel",
     "attribute_labels": ["Size", "Colour", "Fit"], "sort_order": 2},
    {"name": "Footwear", "icon": "👟", "tagline": "Sneakers, boots & heels",
     "attribute_labels": ["Size", "Colour"], "sort_order": 3},
    {"name": "Electronics", "icon": "🎧", "tagline": "Audio, wearables & gadgets",
     "attribute_labels": ["Colour", "Model"], "sort_order": 4},
    {"name": "Home & Living", "icon": "🛋️", "tagline": "Décor, bedding & furniture",
     "attribute_labels": ["Size", "Colour", "Material"], "sort_order": 5},
    {"name": "Beauty & Care", "icon": "💄", "tagline": "Skincare & cosmetics",
     "attribute_labels": ["Size", "Shade"], "sort_order": 6},
    {"name": "Accessories", "icon": "⌚", "tagline": "Watches, bags & eyewear",
     "attribute_labels": ["Colour", "Size"], "sort_order": 7},
]

CATEGORIES = [
    "Cookware", "Bakeware", "Cutlery & Knives", "Drinkware", "Storage",
    "Dinnerware & Serveware", "Appliances",
    "T-Shirts & Tops", "Trousers & Joggers", "Jackets",
    "Sneakers", "Boots & Heels",
    "Audio", "Wearables",
    "Bedding", "Home Décor", "Furniture",
    "Skincare", "Makeup",
    "Watches", "Bags", "Eyewear",
]


def P(name, dept, cat, brand, desc, guide, images, variants):
    return {
        "name": name, "department": dept, "category": cat, "brand": brand,
        "description": desc, "usage_guide": guide, "images": images, "variants": variants,
    }


def V(name, price, stock, attrs=None, image_index=None):
    return {"variant_name": name, "price": price, "stock_qty": stock,
            "attributes": attrs, "image_index": image_index}


PRODUCTS = [
    # ---- Kitchenware ----
    P("Damascus Chef Knife Set", "Kitchenware", "Cutlery & Knives", "Kaihatsu",
      "Hand-forged high-carbon steel knives with full-tang handles and a fitted storage case. "
      "Razor-sharp out of the box and balanced for everyday prep work.",
      "Hand-wash and dry immediately. Hone weekly; sharpen on a whetstone every 2–3 months.",
      [img("1593618998160-e34014e67546")],
      [V("5-Piece Set", 7900, 12, {"Material": "Damascus steel"}),
       V("3-Piece Set", 4500, 18, {"Material": "Damascus steel"})]),
    P("Ceramic Dinnerware Set", "Kitchenware", "Dinnerware & Serveware", "Casa Lina",
      "Stoneware dinner plates, side plates and bowls in a soft matte glaze. "
      "Microwave, oven and dishwasher safe — built for daily use and dinner parties alike.",
      "Dishwasher safe. Avoid thermal shock: don't move straight from freezer to a hot oven.",
      [img("1610701596061-2ecf227e85b2")],
      [V("16-Piece (4 settings)", 6200, 10), V("24-Piece (6 settings)", 8900, 6)]),
    P("High-Speed Blender 1.5L", "Kitchenware", "Appliances", "NutriMix",
      "Crushes ice, frozen fruit and nuts in seconds. 1.5L BPA-free jug, 6 stainless blades "
      "and 3 speeds plus pulse. Smoothies, soups and sauces with zero lumps.",
      "Rinse the jug immediately after use. Run with warm soapy water for 30 seconds to self-clean.",
      [img("1585515320310-259814833e62")],
      [V("600W", 5400, 15, {"Model": "600W"}), V("900W Pro", 7200, 9, {"Model": "900W"})]),
    P("Insulated Steel Bottle", "Kitchenware", "Drinkware", "Hydra",
      "Double-wall vacuum insulation keeps drinks cold 24h or hot 12h. Powder-coated grip, "
      "leak-proof lid, fits car cup holders.",
      "Hand-wash with the brush provided. Do not microwave. Not for fizzy drinks.",
      [img("1602143407151-7111542de6e8")],
      [V("750ml · Forest Green", 1450, 40, {"Capacity": "750ml", "Colour": "Forest Green"}),
       V("750ml · Matte Black", 1450, 35, {"Capacity": "750ml", "Colour": "Matte Black"}),
       V("500ml · Forest Green", 1150, 25, {"Capacity": "500ml", "Colour": "Forest Green"})]),

    # ---- Home & Living ----
    P("Amber Glass Reed Diffuser", "Home & Living", "Home Décor", "Aroma & Co",
      "Slow-release reed diffuser in a hand-blown amber glass bottle. Fills a medium room "
      "with fragrance for up to 8 weeks.",
      "Flip the reeds weekly for a stronger scent. Keep away from direct sunlight.",
      [img("1608571423902-eed4a5ad8108")],
      [V("Lavender & Cedar", 1900, 20, {"Shade": "Lavender"}),
       V("Vanilla & Amber", 1900, 18, {"Shade": "Vanilla"})]),
    P("Premium Cotton Bedsheet Set", "Home & Living", "Bedding", "DreamWeave",
      "400-thread-count long-staple cotton. One flat sheet, one fitted sheet and two "
      "pillowcases. Gets softer with every wash.",
      "Machine wash warm, tumble dry low. Iron on medium if desired.",
      [img("1616594039964-ae9021a400a0")],
      [V("Queen", 4800, 14, {"Size": "Queen"}), V("King", 5600, 10, {"Size": "King"})]),
    P("Boho Macramé Wall Hanging", "Home & Living", "Home Décor", "Artisan Loom",
      "Hand-knotted cotton macramé on a driftwood rod. Adds instant warmth and texture "
      "to a bedroom or living room wall.",
      "Dust gently. Spot-clean only.",
      [img("1556228453-efd6c1ff04f6")],
      [V("Medium (60cm)", 2200, 8, {"Size": "Medium"}), V("Large (90cm)", 3400, 5, {"Size": "Large"})]),
    P("Natural Rattan Coffee Table", "Home & Living", "Furniture", "Casa Lina",
      "Handwoven rattan over a solid mango-wood frame. Light, sturdy and easy to move — "
      "the centrepiece your living room has been missing.",
      "Wipe with a dry cloth. Keep away from prolonged moisture.",
      [img("1583847268964-b28dc8f51f92")],
      [V("Round 70cm", 12500, 4, {"Size": "70cm", "Material": "Rattan"})]),

    # ---- Clothing ----
    P("Classic Cotton T-Shirt", "Clothing", "T-Shirts & Tops", "Everyday Basics",
      "Heavyweight 220gsm combed cotton with a structured collar that keeps its shape. "
      "Pre-shrunk, true to size.",
      "Machine wash cold, inside out. Hang dry to keep the fit.",
      [img("1521572163474-6864f9cf17ab"), img("1581655353564-df123a1eb820")],
      [V("White · S", 950, 30, {"Size": "S", "Colour": "White"}, 1),
       V("White · M", 950, 45, {"Size": "M", "Colour": "White"}, 1),
       V("White · L", 950, 40, {"Size": "L", "Colour": "White"}, 1),
       V("White · XL", 950, 22, {"Size": "XL", "Colour": "White"}, 1)]),
    P("Slim-Fit Denim Jeans", "Clothing", "Trousers & Joggers", "Denim Republic",
      "12oz stretch denim with a tapered leg. Classic five-pocket styling that works "
      "dressed up or down.",
      "Wash rarely, cold, inside out. Air dry.",
      [img("1544441893-675973e31985")],
      [V("W30", 2850, 12, {"Size": "W30"}), V("W32", 2850, 18, {"Size": "W32"}),
       V("W34", 2850, 16, {"Size": "W34"}), V("W36", 2850, 8, {"Size": "W36"})]),
    P("Linen-Blend Jogger Pants", "Clothing", "Trousers & Joggers", "Form&Flow",
      "Breathable linen-cotton blend with an elastic drawstring waist and tapered ankle. "
      "Smart enough for the office, comfortable enough for the couch.",
      "Machine wash cold on gentle. Low iron.",
      [img("1594633312681-425c7b97ccd1")],
      [V("Sand · S", 2400, 10, {"Size": "S", "Colour": "Sand"}),
       V("Sand · M", 2400, 14, {"Size": "M", "Colour": "Sand"}),
       V("Sand · L", 2400, 11, {"Size": "L", "Colour": "Sand"})]),
    P("Heritage Bomber Jacket", "Clothing", "Jackets", "Northwind",
      "Water-resistant shell with a quilted lining, ribbed cuffs and hem. A wardrobe "
      "staple that layers over everything.",
      "Machine wash cold. Do not tumble dry. Close zips before washing.",
      [img("1591047139829-d91aecb6caea")],
      [V("Rust · M", 4950, 9, {"Size": "M", "Colour": "Rust"}),
       V("Rust · L", 4950, 12, {"Size": "L", "Colour": "Rust"}),
       V("Rust · XL", 4950, 6, {"Size": "XL", "Colour": "Rust"})]),

    # ---- Footwear ----
    P("Velocity Running Sneakers", "Footwear", "Sneakers", "Stride",
      "Responsive foam midsole, breathable engineered mesh and a grippy rubber outsole. "
      "Built for daily miles and tempo days.",
      "Remove insoles to air after runs. Spot-clean with mild soap.",
      [img("1542291026-7eec264c27ff"), img("1606107557195-0e29a4b5b4aa"), img("1600185365926-3a2ce3cdb9eb")],
      [V("EU 40 · Crimson", 5800, 8, {"Size": "EU 40", "Colour": "Crimson"}, 0),
       V("EU 41 · Crimson", 5800, 10, {"Size": "EU 41", "Colour": "Crimson"}, 0),
       V("EU 42 · Volt", 5800, 9, {"Size": "EU 42", "Colour": "Volt"}, 1),
       V("EU 43 · White/Orange", 5800, 7, {"Size": "EU 43", "Colour": "White/Orange"}, 2),
       V("EU 44 · Volt", 5800, 5, {"Size": "EU 44", "Colour": "Volt"}, 1)]),
    P("Retro Street Sneakers", "Footwear", "Sneakers", "Stride",
      "Full-grain leather upper on a chunky cupsole. A timeless silhouette in a warm "
      "wheat colourway.",
      "Brush off dirt when dry. Condition leather monthly.",
      [img("1549298916-b41d501d3772")],
      [V("EU 40", 4900, 9, {"Size": "EU 40"}), V("EU 41", 4900, 12, {"Size": "EU 41"}),
       V("EU 42", 4900, 10, {"Size": "EU 42"}), V("EU 43", 4900, 6, {"Size": "EU 43"})]),
    P("Floral Canvas Sneakers", "Footwear", "Sneakers", "Bloom",
      "Lightweight printed canvas with a cushioned footbed. The easiest way to add "
      "colour to any outfit.",
      "Machine washable on cold, air dry.",
      [img("1560769629-975ec94e6a86")],
      [V("EU 36", 3200, 10, {"Size": "EU 36"}), V("EU 37", 3200, 12, {"Size": "EU 37"}),
       V("EU 38", 3200, 14, {"Size": "EU 38"}), V("EU 39", 3200, 9, {"Size": "EU 39"})]),
    P("Suede Hiking Boots", "Footwear", "Boots & Heels", "TrailMaster",
      "Water-repellent suede, padded collar and a lugged outsole that bites into any "
      "trail. Break-in free comfort.",
      "Treat with waterproofing spray before first wear. Air dry away from heat.",
      [img("1525507119028-ed4c629a60a3")],
      [V("EU 41", 7400, 7, {"Size": "EU 41"}), V("EU 42", 7400, 9, {"Size": "EU 42"}),
       V("EU 43", 7400, 8, {"Size": "EU 43"}), V("EU 44", 7400, 5, {"Size": "EU 44"})]),
    P("Sapphire Stiletto Heels", "Footwear", "Boots & Heels", "Velvet Steps",
      "Sculpted 9cm stiletto in a vivid sapphire satin finish with a cushioned insole "
      "for all-night comfort.",
      "Store in the dust bag provided. Avoid wet surfaces.",
      [img("1543163521-1bf539c55dd2")],
      [V("EU 36", 4200, 6, {"Size": "EU 36"}), V("EU 37", 4200, 8, {"Size": "EU 37"}),
       V("EU 38", 4200, 7, {"Size": "EU 38"}), V("EU 39", 4200, 4, {"Size": "EU 39"})]),

    # ---- Electronics ----
    P("Wireless Over-Ear Headphones", "Electronics", "Audio", "PulseAudio",
      "Active noise cancelling, 40-hour battery and plush memory-foam earcups. "
      "Bluetooth 5.3 with multipoint pairing.",
      "Charge fully before first use. Store in the hard case to protect the headband.",
      [img("1505740420928-5e560c06d30e"), img("1583394838336-acd977736f90")],
      [V("Midnight Black", 8900, 15, {"Colour": "Black"}, 0),
       V("Storm Grey", 8900, 11, {"Colour": "Grey"}, 1)]),
    P("Smart Watch Series S", "Electronics", "Wearables", "Veris",
      "AMOLED display, GPS, heart-rate and sleep tracking with 10-day battery life. "
      "5ATM water resistance for swims.",
      "Charge with the magnetic dock. Rinse after salt water exposure.",
      [img("1523275335684-37898b6baf30")],
      [V("Pearl White", 12500, 9, {"Colour": "White"}),
       V("Graphite", 12500, 13, {"Colour": "Graphite"})]),

    # ---- Accessories ----
    P("Automatic Chronograph Watch", "Accessories", "Watches", "Heritage Time",
      "Self-winding mechanical movement with an exhibition case back, sapphire crystal "
      "and 5ATM water resistance.",
      "Service every 3–5 years. Keep away from strong magnets.",
      [img("1524805444758-089113d48a6d"), img("1434056886845-dac89ffe9b56")],
      [V("Leather Strap", 18500, 5, {"Colour": "Brown leather"}, 0),
       V("Steel Bracelet", 21000, 4, {"Colour": "Steel"}, 1)]),
    P("Polarised Sunglasses", "Accessories", "Eyewear", "SunCraft",
      "UV400 polarised lenses in a featherweight acetate frame. Cuts glare on the road "
      "and the water.",
      "Clean with the microfibre cloth only. Store in the hard case.",
      [img("1572635196237-14b3f281503f")],
      [V("Matte Black", 2600, 25, {"Colour": "Matte Black"})]),
    P("Urban Laptop Backpack 15.6\"", "Accessories", "Bags", "Metro Gear",
      "Water-resistant shell, padded laptop sleeve, anti-theft back pocket and a USB "
      "pass-through port. Carry-on friendly.",
      "Spot-clean with a damp cloth. Air dry.",
      [img("1553062407-98eeb64c6a62")],
      [V("Navy", 3900, 20, {"Colour": "Navy"}), V("Black", 3900, 16, {"Colour": "Black"})]),

    # ---- Beauty & Care ----
    P("Vitamin-C Glow Skincare Duo", "Beauty & Care", "Skincare", "Lumière",
      "Brightening vitamin-C serum paired with a hyaluronic moisturiser. Fragrance-free, "
      "suitable for sensitive skin.",
      "Apply serum to clean skin morning and night, follow with moisturiser. Use SPF daily.",
      [img("1571781926291-c477ebfd024b")],
      [V("30ml + 50ml", 3800, 18, {"Size": "Standard"})]),
    P("Pro Makeup Brush Collection", "Beauty & Care", "Makeup", "Velour",
      "Ultra-soft synthetic bristles, sculpted handles and a roll-up travel pouch. "
      "Everything from base to detail work.",
      "Wash brushes weekly with gentle shampoo, reshape and dry flat.",
      [img("1596462502278-27bfdc403348")],
      [V("12-Piece", 2900, 14, {"Size": "12-Piece"}), V("8-Piece", 1900, 20, {"Size": "8-Piece"})]),
]


async def dedupe_products(db) -> int:
    """Remove exact-name duplicate products, keeping the oldest copy."""
    result = await db.execute(select(Product).order_by(Product.id))
    by_name: dict[str, list[Product]] = defaultdict(list)
    for p in result.scalars().all():
        by_name[p.name].append(p)
    removed = 0
    for copies in by_name.values():
        for extra in copies[1:]:
            await db.delete(extra)
            removed += 1
    await db.commit()
    return removed


async def main() -> None:
    async with AsyncSessionLocal() as db:
        removed = await dedupe_products(db)

        # Departments by name
        existing_depts = {d.name: d for d in (await db.execute(select(Department))).scalars().all()}
        for spec in DEPARTMENTS:
            if spec["name"] in existing_depts:
                continue
            dept = await department_crud.create(db, DepartmentCreate(
                name=spec["name"], tagline=spec["tagline"], icon=spec["icon"],
                attribute_labels=spec["attribute_labels"], sort_order=spec["sort_order"],
            ))
            existing_depts[dept.name] = dept
            print(f"  + department: {dept.name}")

        # Categories by name
        existing_cats = {c.name: c for c in (await db.execute(select(ShopCategory))).scalars().all()}
        for name in CATEGORIES:
            if name in existing_cats:
                continue
            cat = ShopCategory(name=name, slug=await unique_slug(db, ShopCategory, name))
            db.add(cat)
            await db.commit()
            await db.refresh(cat)
            existing_cats[name] = cat
            print(f"  + category: {name}")

        # Products by name
        existing_names = {
            p.name for p in (await db.execute(select(Product))).scalars().all()
        }
        created = 0
        for spec in PRODUCTS:
            if spec["name"] in existing_names:
                continue
            variants = [VariantCreate(**v) for v in spec["variants"]]
            payload = ProductCreate(
                name=spec["name"],
                description=spec["description"],
                usage_guide=spec["usage_guide"],
                brand=spec["brand"],
                department_id=existing_depts[spec["department"]].id,
                shop_category_id=existing_cats[spec["category"]].id,
                base_price=variants[0].price,
                variants=variants,
                image_urls=spec["images"],
            )
            product = await product_crud.create(db, payload)
            created += 1
            print(f"  + product: {product.name} ({len(product.variants)} variants)")

        print(f"\nDone. Removed {removed} duplicate(s), created {created} product(s).")


if __name__ == "__main__":
    asyncio.run(main())
