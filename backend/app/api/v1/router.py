from fastapi import APIRouter

from app.api.v1 import auth, documents, health, invoices, users

api_router = APIRouter(prefix="/api/v1")
api_router.include_router(health.router)
api_router.include_router(auth.router)
api_router.include_router(users.router)
api_router.include_router(documents.router)
api_router.include_router(invoices.router)
