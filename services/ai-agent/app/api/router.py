"""Aggregated API router."""

from __future__ import annotations

from fastapi import APIRouter

from app.api.advice import router as advice_router
from app.api.chat import router as chat_router
from app.api.diagnosis import router as diagnosis_router
from app.api.health import router as health_router
from app.api.memory_api import router as memory_router
from app.api.admin import router as admin_router

api_router = APIRouter()

api_router.include_router(chat_router)
api_router.include_router(advice_router)
api_router.include_router(diagnosis_router)
api_router.include_router(memory_router)
api_router.include_router(admin_router)
api_router.include_router(health_router)
