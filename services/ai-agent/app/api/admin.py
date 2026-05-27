"""Admin endpoints for analytics and audit log queries."""

from __future__ import annotations

from fastapi import APIRouter, Depends, Query, Request

from app.analytics.dashboard import get_cost_breakdown, get_overview
from app.api.deps import verify_admin_key

router = APIRouter(prefix="/admin", tags=["admin"])


@router.get("/analytics/overview")
async def analytics_overview(
    request: Request,
    days: int = Query(7, ge=1, le=90),
    admin_key: str = Depends(verify_admin_key),
):
    """Get analytics overview data."""
    db = request.app.state.memory_db
    return await get_overview(db, days)


@router.get("/analytics/costs")
async def analytics_costs(
    request: Request,
    days: int = Query(7, ge=1, le=90),
    admin_key: str = Depends(verify_admin_key),
):
    """Get cost breakdown by model and day."""
    db = request.app.state.memory_db
    return await get_cost_breakdown(db, days)


@router.get("/audit/events")
async def audit_events(
    request: Request,
    user_id: str | None = None,
    event_type: str | None = None,
    limit: int = Query(50, ge=1, le=500),
    admin_key: str = Depends(verify_admin_key),
):
    """Query audit events."""
    db = request.app.state.memory_db

    conditions = []
    params: list = []

    if user_id:
        conditions.append("user_id = ?")
        params.append(user_id)
    if event_type:
        conditions.append("event_type = ?")
        params.append(event_type)

    where = f"WHERE {' AND '.join(conditions)}" if conditions else ""
    rows = await db.fetch_all(
        f"SELECT * FROM audit_events {where} ORDER BY timestamp DESC LIMIT ?",
        (*params, limit),
    )

    return {
        "events": [dict(row) for row in rows],
        "count": len(rows),
        "filters": {"user_id": user_id, "event_type": event_type},
    }


@router.get("/memory/{user_id}")
async def get_user_memory(
    request: Request,
    user_id: str,
    admin_key: str = Depends(verify_admin_key),
):
    """Get all stored memories for a user (admin)."""
    db = request.app.state.memory_db
    rows = await db.fetch_all(
        "SELECT key, value, importance, created_at, updated_at FROM user_memory WHERE user_id = ? ORDER BY importance DESC",
        (user_id,),
    )
    return {"user_id": user_id, "memories": [dict(row) for row in rows], "count": len(rows)}
