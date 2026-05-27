"""Health check and metrics endpoints."""

from __future__ import annotations

from fastapi import APIRouter, Request
from fastapi.responses import PlainTextResponse

from app.analytics.collector import get_metrics
from app.db import mysql_manager

router = APIRouter(tags=["health"])


@router.get("/health")
async def health(request: Request) -> dict:
    """Health check endpoint for Docker orchestration."""
    mysql_ok = mysql_manager.is_available
    return {
        "status": "ok",
        "version": "0.1.0",
        "mysql": "connected" if mysql_ok else "disconnected",
        "memory_db": "connected" if hasattr(request.app.state, "memory_db") else "disconnected",
    }


@router.get("/metrics")
async def metrics() -> PlainTextResponse:
    """Prometheus metrics endpoint."""
    return PlainTextResponse(content=get_metrics(), media_type="text/plain")
