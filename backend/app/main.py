from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.api.routes import equipment, clients, transactions, categories, users, auth, activity_logs
from app import models  # noqa: F401 — registers all ORM models with Base.metadata

app = FastAPI(title="Equipment Management System", version="0.2.0")

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

app.include_router(equipment.router)
app.include_router(clients.router)
app.include_router(transactions.router)
app.include_router(categories.router)
app.include_router(users.router)
app.include_router(auth.router)
app.include_router(activity_logs.router)


@app.get("/health", tags=["Health"])
async def health():
    return {"status": "ok"}
