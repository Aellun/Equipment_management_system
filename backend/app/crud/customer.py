from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
import bcrypt

from app.models.customer import Customer
from app.schemas.customer import CustomerRegister, CustomerUpdate


def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()


def verify_password(plain: str, hashed: str) -> bool:
    return bcrypt.checkpw(plain.encode(), hashed.encode())


async def get_all(db: AsyncSession) -> list[Customer]:
    result = await db.execute(select(Customer).order_by(Customer.id.desc()))
    return list(result.scalars().all())


async def get_by_id(db: AsyncSession, customer_id: int) -> Customer | None:
    result = await db.execute(select(Customer).where(Customer.id == customer_id))
    return result.scalar_one_or_none()


async def get_by_email(db: AsyncSession, email: str) -> Customer | None:
    result = await db.execute(select(Customer).where(Customer.email == email))
    return result.scalar_one_or_none()


async def create(db: AsyncSession, payload: CustomerRegister) -> Customer:
    customer = Customer(
        name=payload.name,
        email=payload.email,
        password_hash=hash_password(payload.password),
        phone=payload.phone,
        shipping_address=payload.shipping_address,
    )
    db.add(customer)
    await db.commit()
    await db.refresh(customer)
    return customer


async def update(db: AsyncSession, customer: Customer, payload: CustomerUpdate) -> Customer:
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(customer, field, value)
    await db.commit()
    await db.refresh(customer)
    return customer
