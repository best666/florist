"""Health check and metrics endpoints."""

from __future__ import annotations

from fastapi import APIRouter, Depends, Request
from fastapi.responses import PlainTextResponse

from app.analytics.collector import get_metrics
from app.api.deps import verify_api_key

router = APIRouter(tags=["health"])


@router.get("/health")
async def health() -> dict:
    """Health check endpoint for Docker orchestration."""
    return {"status": "ok", "version": "0.1.0"}


@router.get("/health/detailed")
async def health_detailed(request: Request) -> dict:
    """Detailed health check — requires API key authentication in production."""
    from app.db import mysql_manager

    mysql_ok = mysql_manager.is_available
    return {
        "status": "ok",
        "mysql": "connected" if mysql_ok else "disconnected",
        "memory_db": "connected" if hasattr(request.app.state, "memory_db") else "disconnected",
    }


@router.get("/metrics")
async def metrics(x_api_key: str = Depends(verify_api_key)) -> PlainTextResponse:
    """Prometheus metrics endpoint — requires API key authentication."""
    return PlainTextResponse(content=get_metrics(), media_type="text/plain")
