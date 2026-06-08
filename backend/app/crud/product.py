import uuid
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from app.models.product import Product, ProductVariant, ProductImage
from app.schemas.product import ProductCreate, ProductUpdate, VariantCreate, VariantUpdate
from app.crud.slug import slugify, unique_slug


def _generate_sku(product_name: str, variant_name: str) -> str:
    prefix = f"{slugify(product_name)[:6].upper()}-{slugify(variant_name)[:4].upper()}"
    return f"{prefix}-{uuid.uuid4().hex[:5].upper()}"


_LOAD = (selectinload(Product.variants), selectinload(Product.images))


async def get_all(db: AsyncSession, active_only: bool = False) -> list[Product]:
    stmt = select(Product).options(*_LOAD).order_by(Product.name, Product.id)
    if active_only:
        stmt = stmt.where(Product.is_active.is_(True))
    result = await db.execute(stmt)
    return list(result.scalars().all())


async def get_by_id(db: AsyncSession, product_id: int) -> Product | None:
    result = await db.execute(
        select(Product).options(*_LOAD).where(Product.id == product_id)
    )
    return result.scalar_one_or_none()


async def get_by_slug(db: AsyncSession, slug: str) -> Product | None:
    result = await db.execute(
        select(Product).options(*_LOAD).where(Product.slug == slug)
    )
    return result.scalar_one_or_none()


async def create(db: AsyncSession, payload: ProductCreate) -> Product:
    product = Product(
        name=payload.name,
        description=payload.description,
        usage_guide=payload.usage_guide,
        brand=payload.brand,
        department_id=payload.department_id,
        shop_category_id=payload.shop_category_id,
        base_price=payload.base_price,
        is_active=payload.is_active,
        is_genuine_guaranteed=payload.is_genuine_guaranteed,
        slug=await unique_slug(db, Product, payload.name),
    )
    db.add(product)
    await db.flush()

    # Create images first so we can resolve each variant's image_index -> image_id
    images: list[ProductImage] = []
    for i, url in enumerate(payload.image_urls):
        img = ProductImage(product_id=product.id, url=url, sort_order=i)
        db.add(img)
        images.append(img)
    await db.flush()

    for v in payload.variants:
        image_id = None
        if v.image_index is not None and 0 <= v.image_index < len(images):
            image_id = images[v.image_index].id
        db.add(ProductVariant(
            product_id=product.id,
            sku=v.sku or _generate_sku(payload.name, v.variant_name),
            variant_name=v.variant_name,
            price=v.price,
            stock_qty=v.stock_qty,
            attributes=v.attributes,
            is_active=v.is_active,
            image_id=image_id,
        ))

    await db.commit()
    return await get_by_id(db, product.id)


async def duplicate(db: AsyncSession, product: Product) -> Product:
    """Clone a product with its variants and images (fresh SKUs, '(Copy)' suffix)."""
    clone = Product(
        name=f"{product.name} (Copy)",
        description=product.description,
        usage_guide=product.usage_guide,
        brand=product.brand,
        department_id=product.department_id,
        shop_category_id=product.shop_category_id,
        base_price=product.base_price,
        is_active=False,  # start hidden so admin can review before publishing
        is_genuine_guaranteed=product.is_genuine_guaranteed,
        slug=await unique_slug(db, Product, product.name),
    )
    db.add(clone)
    await db.flush()

    # Copy images, remembering old->new id mapping to re-link variants
    id_map: dict[int, int] = {}
    for img in product.images:
        new_img = ProductImage(product_id=clone.id, url=img.url, sort_order=img.sort_order)
        db.add(new_img)
        await db.flush()
        id_map[img.id] = new_img.id

    for v in product.variants:
        db.add(ProductVariant(
            product_id=clone.id,
            sku=_generate_sku(clone.name, v.variant_name),
            variant_name=v.variant_name,
            price=v.price,
            stock_qty=v.stock_qty,
            attributes=v.attributes,
            is_active=v.is_active,
            image_id=id_map.get(v.image_id) if v.image_id else None,
        ))

    await db.commit()
    return await get_by_id(db, clone.id)


async def update(db: AsyncSession, product: Product, payload: ProductUpdate) -> Product:
    data = payload.model_dump(exclude_unset=True)
    if "name" in data and data["name"] and data["name"] != product.name:
        product.slug = await unique_slug(db, Product, data["name"])
    for field, value in data.items():
        setattr(product, field, value)
    await db.commit()
    return await get_by_id(db, product.id)


async def delete(db: AsyncSession, product: Product) -> None:
    await db.delete(product)
    await db.commit()


# ---- Variants ----
async def add_variant(db: AsyncSession, product: Product, payload: VariantCreate) -> ProductVariant:
    variant = ProductVariant(
        product_id=product.id,
        sku=payload.sku or _generate_sku(product.name, payload.variant_name),
        variant_name=payload.variant_name,
        price=payload.price,
        stock_qty=payload.stock_qty,
        attributes=payload.attributes,
        is_active=payload.is_active,
    )
    db.add(variant)
    await db.commit()
    await db.refresh(variant)
    return variant


async def get_variant(db: AsyncSession, variant_id: int) -> ProductVariant | None:
    result = await db.execute(select(ProductVariant).where(ProductVariant.id == variant_id))
    return result.scalar_one_or_none()


async def update_variant(db: AsyncSession, variant: ProductVariant, payload: VariantUpdate) -> ProductVariant:
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(variant, field, value)
    await db.commit()
    await db.refresh(variant)
    return variant


async def delete_variant(db: AsyncSession, variant: ProductVariant) -> None:
    await db.delete(variant)
    await db.commit()


# ---- Images ----
async def add_image(db: AsyncSession, product: Product, url: str) -> ProductImage:
    sort_order = len(product.images)
    image = ProductImage(product_id=product.id, url=url, sort_order=sort_order)
    db.add(image)
    await db.commit()
    await db.refresh(image)
    return image


async def get_image(db: AsyncSession, image_id: int) -> ProductImage | None:
    result = await db.execute(select(ProductImage).where(ProductImage.id == image_id))
    return result.scalar_one_or_none()


async def delete_image(db: AsyncSession, image: ProductImage) -> None:
    await db.delete(image)
    await db.commit()
