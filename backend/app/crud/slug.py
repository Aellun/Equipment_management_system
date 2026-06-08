import re
import uuid


def slugify(text: str) -> str:
    base = re.sub(r"[^a-z0-9]+", "-", text.lower()).strip("-")
    return base or "item"


async def unique_slug(db, model, text: str) -> str:
    """Generate a slug unique against ``model.slug``, appending a short suffix on collision."""
    from sqlalchemy import select

    base = slugify(text)
    candidate = base
    while True:
        existing = await db.execute(select(model).where(model.slug == candidate))
        if existing.scalar_one_or_none() is None:
            return candidate
        candidate = f"{base}-{uuid.uuid4().hex[:5]}"
