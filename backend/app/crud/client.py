from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.models.client import Client
from app.schemas.client import ClientCreate, ClientUpdate


async def get_all(db: AsyncSession) -> list[Client]:
    result = await db.execute(select(Client))
    return list(result.scalars().all())


async def get_by_id(db: AsyncSession, client_id: int) -> Client | None:
    result = await db.execute(select(Client).where(Client.id == client_id))
    return result.scalar_one_or_none()


async def create(db: AsyncSession, payload: ClientCreate) -> Client:
    client = Client(**payload.model_dump())
    db.add(client)
    await db.commit()
    await db.refresh(client)
    return client


async def update(db: AsyncSession, client: Client, payload: ClientUpdate) -> Client:
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(client, field, value)
    await db.commit()
    await db.refresh(client)
    return client


async def delete(db: AsyncSession, client: Client) -> None:
    await db.delete(client)
    await db.commit()
