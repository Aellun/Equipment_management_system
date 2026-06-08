import uuid
from decimal import Decimal

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from fastapi import HTTPException

from app.models.cart import Cart, CartItem
from app.models.product import ProductVariant, Product
from app.schemas.cart import CartItemCreate, CartItemUpdate


_LOAD = selectinload(Cart.items).selectinload(CartItem.variant).selectinload(ProductVariant.product).selectinload(Product.images)


async def _get_cart_by_token(db: AsyncSession, session_token: str) -> Cart | None:
    result = await db.execute(
        select(Cart).options(_LOAD).where(Cart.session_token == session_token)
    )
    return result.scalar_one_or_none()


async def get_or_create(db: AsyncSession, session_token: str | None, customer_id: int | None) -> Cart:
    if session_token:
        cart = await _get_cart_by_token(db, session_token)
        if cart:
            if customer_id and cart.customer_id != customer_id:
                cart.customer_id = customer_id
                await db.commit()
            return cart
    cart = Cart(session_token=session_token or uuid.uuid4().hex, customer_id=customer_id)
    db.add(cart)
    await db.commit()
    return await _get_cart_by_token(db, cart.session_token)


async def get(db: AsyncSession, session_token: str) -> Cart | None:
    return await _get_cart_by_token(db, session_token)


async def add_item(db: AsyncSession, payload: CartItemCreate) -> Cart:
    cart = await get_or_create(db, payload.session_token, None)

    variant = (await db.execute(
        select(ProductVariant).where(ProductVariant.id == payload.variant_id)
    )).scalar_one_or_none()
    if not variant or not variant.is_active:
        raise HTTPException(status_code=404, detail="Variant not found")

    existing = next((i for i in cart.items if i.variant_id == payload.variant_id), None)
    new_qty = (existing.quantity if existing else 0) + payload.quantity
    if new_qty > variant.stock_qty:
        raise HTTPException(status_code=400, detail=f"Only {variant.stock_qty} in stock")

    if existing:
        existing.quantity = new_qty
    else:
        db.add(CartItem(cart_id=cart.id, variant_id=payload.variant_id, quantity=payload.quantity))
    await db.commit()
    db.expire_all()  # force the re-fetch below to reload relationships, not the stale identity-map copy
    return await _get_cart_by_token(db, payload.session_token)


async def update_item(db: AsyncSession, item_id: int, payload: CartItemUpdate) -> Cart:
    item = (await db.execute(
        select(CartItem).options(selectinload(CartItem.variant)).where(CartItem.id == item_id)
    )).scalar_one_or_none()
    if not item:
        raise HTTPException(status_code=404, detail="Cart item not found")
    if payload.quantity > item.variant.stock_qty:
        raise HTTPException(status_code=400, detail=f"Only {item.variant.stock_qty} in stock")
    item.quantity = payload.quantity
    cart = (await db.execute(select(Cart).where(Cart.id == item.cart_id))).scalar_one()
    token = cart.session_token
    await db.commit()
    db.expire_all()
    return await _get_cart_by_token(db, token)


async def remove_item(db: AsyncSession, item_id: int) -> Cart | None:
    item = (await db.execute(select(CartItem).where(CartItem.id == item_id))).scalar_one_or_none()
    if not item:
        raise HTTPException(status_code=404, detail="Cart item not found")
    cart = (await db.execute(select(Cart).where(Cart.id == item.cart_id))).scalar_one()
    token = cart.session_token
    await db.delete(item)
    await db.commit()
    db.expire_all()
    return await _get_cart_by_token(db, token)


def serialize(cart: Cart) -> dict:
    """Flatten a Cart ORM object into the CartOut shape with product info & totals."""
    items = []
    subtotal = Decimal("0")
    for it in cart.items:
        variant = it.variant
        product = variant.product if variant else None
        line_total = (Decimal(str(variant.price)) * it.quantity) if variant else Decimal("0")
        subtotal += line_total
        image_url = None
        if product and product.images:
            image_url = product.images[0].url
        items.append({
            "id": it.id,
            "variant_id": it.variant_id,
            "quantity": it.quantity,
            "variant": variant,
            "product_name": product.name if product else None,
            "product_slug": product.slug if product else None,
            "image_url": image_url,
            "line_total": line_total,
        })
    return {
        "id": cart.id,
        "session_token": cart.session_token,
        "customer_id": cart.customer_id,
        "items": items,
        "subtotal": subtotal,
    }
