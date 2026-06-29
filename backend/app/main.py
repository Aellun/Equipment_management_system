import os

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles

from app.api.routes import (
    equipment, clients, transactions, categories, users, auth, activity_logs,
    maintenance, reservations,
    shop_categories, products, shop, cart, orders, customers, uploads,
    departments, reviews, delivery, returns,
)
from app import models  # noqa: F401 — registers all ORM models with Base.metadata
from app.errands.setup import (
    ERRANDS_MEDIA_DIR,
    include_errands_routers,
    init_errands_db,
)

app = FastAPI(title="Dyzah Platform — Equipment · Store · Errands · Hygiene", version="0.4.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.exception_handler(Exception)
async def unhandled_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    response = JSONResponse(status_code=500, content={"detail": "Internal server error"})
    response.headers["Access-Control-Allow-Origin"] = "*"
    return response

# Equipment Management System
app.include_router(equipment.router)
app.include_router(clients.router)
app.include_router(transactions.router)
app.include_router(categories.router)
app.include_router(users.router)
app.include_router(auth.router)
app.include_router(activity_logs.router)
app.include_router(maintenance.router)
app.include_router(reservations.router)

# E-commerce
app.include_router(shop_categories.router)
app.include_router(products.router)
app.include_router(shop.router)
app.include_router(cart.router)
app.include_router(orders.router)
app.include_router(customers.router)
app.include_router(uploads.router)
app.include_router(departments.router)
app.include_router(reviews.router)
app.include_router(delivery.router)
app.include_router(returns.router)

# Errands & Hygiene (catalog-driven services; shared booking/escrow engine).
# These run on a separate sync engine against the SAME database; FastAPI runs
# the sync handlers in a threadpool.
include_errands_routers(app)


@app.on_event("startup")
def _startup_errands() -> None:
    init_errands_db()


# Serve uploaded product images
os.makedirs("uploads", exist_ok=True)
app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")

# Serve errands/hygiene proof photos
os.makedirs(ERRANDS_MEDIA_DIR, exist_ok=True)
app.mount("/errands-media", StaticFiles(directory=ERRANDS_MEDIA_DIR), name="errands-media")


@app.get("/health", tags=["Health"])
async def health():
    return {"status": "ok"}
