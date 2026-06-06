"""FastAPI dependency injection helpers."""

from __future__ import annotations

from fastapi import Header, HTTPException, Request

from app.agent.engine import AgentEngine
from app.config import settings


def verify_api_key(x_api_key: str = Header(..., alias="X-API-Key")) -> str:
    """Verify API key from request header."""
    if x_api_key != settings.api_key:
        raise HTTPException(status_code=401, detail="Invalid API key")
    return x_api_key


def verify_admin_key(x_admin_key: str = Header(..., alias="X-Admin-Key")) -> str:
    """Verify admin key for management endpoints."""
    if x_admin_key != settings.admin_key:
        raise HTTPException(status_code=401, detail="Invalid admin key")
    return x_admin_key


async def get_agent(request: Request) -> AgentEngine:
    """Get AgentEngine instance from app state."""
    memory_db = request.app.state.memory_db
    return AgentEngine(memory_db)


# Alias for tools_api compatibility
get_agent_engine = get_agent
