from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_db, require_staff
from app.crud import client as crud
from app.crud import transaction as transaction_crud
from app.crud import activity as activity_crud
from app.schemas.client import ClientCreate, ClientUpdate, ClientOut
from app.schemas.transaction import TransactionOut

router = APIRouter(prefix="/clients", tags=["Clients"], dependencies=[Depends(require_staff)])


@router.get("/", response_model=list[ClientOut])
async def list_clients(db: AsyncSession = Depends(get_db)):
    return await crud.get_all(db)


@router.get("/{client_id}", response_model=ClientOut)
async def get_client(client_id: int, db: AsyncSession = Depends(get_db)):
    client = await crud.get_by_id(db, client_id)
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")
    return client


@router.post("/", response_model=ClientOut, status_code=201)
async def create_client(payload: ClientCreate, db: AsyncSession = Depends(get_db)):
    client = await crud.create(db, payload)
    await activity_crud.log(
        db,
        action="create",
        entity_type="client",
        entity_id=client.id,
        entity_name=client.name,
        details={"email": client.email},
    )
    return client


@router.patch("/{client_id}", response_model=ClientOut)
async def update_client(client_id: int, payload: ClientUpdate, db: AsyncSession = Depends(get_db)):
    client = await crud.get_by_id(db, client_id)
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")
    return await crud.update(db, client, payload)


@router.delete("/{client_id}", status_code=204)
async def delete_client(client_id: int, db: AsyncSession = Depends(get_db)):
    client = await crud.get_by_id(db, client_id)
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")
    name = client.name
    email = client.email
    await crud.delete(db, client)
    await activity_crud.log(
        db,
        action="delete",
        entity_type="client",
        entity_id=client_id,
        entity_name=name,
        details={"email": email},
    )


@router.get("/{client_id}/history", response_model=list[TransactionOut])
async def get_client_history(client_id: int, db: AsyncSession = Depends(get_db)):
    client = await crud.get_by_id(db, client_id)
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")
    return await transaction_crud.get_client_history(db, client_id)
