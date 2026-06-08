import uuid
from datetime import datetime, timezone
from decimal import Decimal

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from fastapi import HTTPException

from app.models.order import Order, OrderItem, OrderStatus, PaymentStatus
from app.models.cart import Cart, CartItem
from app.models.product import ProductVariant
from app.models.delivery import DeliveryZone
from app.models.tracking import TrackingEvent
from app.schemas.order import CheckoutPayload, OrderUpdate


_LOAD = (selectinload(Order.items), selectinload(Order.tracking_events))


def _generate_order_number() -> str:
    stamp = datetime.now(timezone.utc).strftime("%Y%m%d")
    return f"ORD-{stamp}-{uuid.uuid4().hex[:6].upper()}"


async def get_all(db: AsyncSession) -> list[Order]:
    result = await db.execute(select(Order).options(*_LOAD).order_by(Order.created_at.desc()))
    return list(result.scalars().all())


async def get_by_id(db: AsyncSession, order_id: int) -> Order | None:
    result = await db.execute(select(Order).options(*_LOAD).where(Order.id == order_id))
    return result.scalar_one_or_none()


async def get_by_number(db: AsyncSession, order_number: str) -> Order | None:
    result = await db.execute(
        select(Order).options(*_LOAD).where(Order.order_number == order_number.strip().upper())
    )
    return result.scalar_one_or_none()


async def get_for_customer(db: AsyncSession, customer_id: int) -> list[Order]:
    result = await db.execute(
        select(Order).options(*_LOAD).where(Order.customer_id == customer_id).order_by(Order.created_at.desc())
    )
    return list(result.scalars().all())


async def checkout(db: AsyncSession, payload: CheckoutPayload) -> Order:
    """Atomically create an order from a cart: validate stock, snapshot prices,
    apply delivery fee, decrement stock, clear the cart, seed tracking — one transaction."""
    cart = (await db.execute(
        select(Cart)
        .options(selectinload(Cart.items).selectinload(CartItem.variant).selectinload(ProductVariant.product))
        .where(Cart.session_token == payload.session_token)
    )).scalar_one_or_none()

    if not cart or not cart.items:
        raise HTTPException(status_code=400, detail="Cart is empty")

    # Validate stock for every line first (fail before any mutation)
    for item in cart.items:
        variant = item.variant
        if not variant or not variant.is_active:
            raise HTTPException(status_code=400, detail="A product in your cart is no longer available")
        if item.quantity > variant.stock_qty:
            raise HTTPException(
                status_code=400,
                detail=f"Insufficient stock for {variant.product.name} ({variant.variant_name}). "
                       f"Only {variant.stock_qty} left.",
            )

    subtotal = Decimal("0")
    for item in cart.items:
        subtotal += Decimal(str(item.variant.price)) * item.quantity

    # Resolve delivery fee from the chosen zone + method
    delivery_fee = Decimal("0")
    zone_name = None
    method = payload.delivery_method if payload.delivery_method in ("door", "pickup") else "door"
    if payload.delivery_zone_id is not None:
        zone = (await db.execute(
            select(DeliveryZone).where(DeliveryZone.id == payload.delivery_zone_id)
        )).scalar_one_or_none()
        if zone:
            zone_name = zone.name
            if method == "pickup":
                delivery_fee = Decimal(str(zone.pickup_fee))
            else:
                if zone.free_over is not None and subtotal >= Decimal(str(zone.free_over)):
                    delivery_fee = Decimal("0")
                else:
                    delivery_fee = Decimal(str(zone.door_fee))

    order = Order(
        order_number=_generate_order_number(),
        customer_id=payload.customer_id or cart.customer_id,
        status=OrderStatus.pending,
        contact_name=payload.contact_name,
        contact_email=payload.contact_email,
        contact_phone=payload.contact_phone,
        shipping_address=payload.shipping_address,
        delivery_zone_name=zone_name,
        delivery_method=method,
        delivery_fee=delivery_fee,
    )
    db.add(order)
    await db.flush()

    for item in cart.items:
        variant = item.variant
        unit_price = Decimal(str(variant.price))
        line_total = unit_price * item.quantity
        db.add(OrderItem(
            order_id=order.id,
            variant_id=variant.id,
            product_name=variant.product.name,
            variant_name=variant.variant_name,
            unit_price=unit_price,
            quantity=item.quantity,
            line_total=line_total,
        ))
        variant.stock_qty -= item.quantity

    order.subtotal = subtotal
    order.total = subtotal + delivery_fee

    # Seed the tracking timeline
    db.add(TrackingEvent(order_id=order.id, status="Pending", note="Order placed — awaiting confirmation."))

    # Clear the cart
    for item in list(cart.items):
        await db.delete(item)

    await db.commit()
    return await get_by_id(db, order.id)


_STATUS_NOTES = {
    "Pending": "Order placed — awaiting confirmation.",
    "Confirmed": "Order confirmed. We're preparing your items.",
    "Processing": "Your order is being packed.",
    "Shipped": "Your order is on the way.",
    "Delivered": "Delivered. Enjoy!",
    "Cancelled": "Order cancelled.",
}


def _status_str(value) -> str:
    return value.value if hasattr(value, "value") else str(value)


async def update(db: AsyncSession, order: Order, payload: OrderUpdate) -> Order:
    data = payload.model_dump(exclude_unset=True)
    note = data.pop("tracking_note", None)
    explicit_status = data.get("status")
    new_payment = data.get("payment_status")

    for field, value in data.items():
        setattr(order, field, value)

    # Determine the effective status, applying payment-driven automation:
    #   Paid     -> Delivered   (pay-on-delivery: paid means it arrived)
    #   Refunded -> Cancelled
    # An explicit status in the same request always wins.
    auto_status = None
    if explicit_status is None and new_payment is not None:
        pay = _status_str(new_payment)
        if pay == PaymentStatus.paid.value:
            auto_status = OrderStatus.delivered
        elif pay == PaymentStatus.refunded.value:
            auto_status = OrderStatus.cancelled
        if auto_status is not None and order.status != auto_status:
            order.status = auto_status

    # Record a tracking event for whichever status actually changed
    effective_status = explicit_status if explicit_status is not None else auto_status
    if effective_status is not None:
        status_value = _status_str(effective_status)
        default_note = _STATUS_NOTES.get(status_value)
        if auto_status is not None and explicit_status is None:
            default_note = f"Payment {_status_str(new_payment).lower()} — {default_note}"
        db.add(TrackingEvent(
            order_id=order.id,
            status=status_value,
            note=note or default_note,
        ))

    await db.commit()
    db.expire_all()  # ensure the reload below includes the new tracking event
    return await get_by_id(db, order.id)
