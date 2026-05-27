"""Analytics dashboard data API helpers."""

from __future__ import annotations

from datetime import datetime, timedelta

from app.memory.db import MemoryDatabase


async def get_overview(db: MemoryDatabase, days: int = 7) -> dict:
    """Get analytics overview for the dashboard."""
    since = (datetime.now() - timedelta(days=days)).isoformat()

    total_conversations = await db.fetch_one(
        "SELECT COUNT(*) as cnt FROM conversations WHERE updated_at >= ?", (since,)
    )
    total_messages = await db.fetch_one(
        "SELECT COUNT(*) as cnt FROM messages WHERE created_at >= ?", (since,)
    )
    active_users_count = await db.fetch_one(
        "SELECT COUNT(DISTINCT user_id) as cnt FROM audit_events WHERE timestamp >= ?", (since,)
    )
    total_cost = await db.fetch_one(
        "SELECT SUM(cost_usd) as total FROM cost_records WHERE created_at >= ?", (since,)
    )
    total_audit = await db.fetch_one(
        "SELECT COUNT(*) as cnt FROM audit_events WHERE timestamp >= ? AND status = 'success'", (since,)
    )
    blocked_audit = await db.fetch_one(
        "SELECT COUNT(*) as cnt FROM audit_events WHERE timestamp >= ? AND status = 'blocked'", (since,)
    )

    return {
        "period": f"{since[:10]} ~ {datetime.now().strftime('%Y-%m-%d')}",
        "total_conversations": total_conversations["cnt"] if total_conversations else 0,
        "total_messages": total_messages["cnt"] if total_messages else 0,
        "active_users": active_users_count["cnt"] if active_users_count else 0,
        "total_cost_usd": round(float(total_cost["total"]), 2) if total_cost and total_cost["total"] else 0.0,
        "successful_requests": total_audit["cnt"] if total_audit else 0,
        "blocked_requests": blocked_audit["cnt"] if blocked_audit else 0,
    }


async def get_cost_breakdown(db: MemoryDatabase, days: int = 7) -> dict:
    """Get cost breakdown by model."""
    since = (datetime.now() - timedelta(days=days)).isoformat()

    daily = await db.fetch_all(
        """SELECT date_key, SUM(cost_usd) as cost, SUM(tokens_input) as tokens
           FROM cost_records WHERE created_at >= ?
           GROUP BY date_key ORDER BY date_key DESC""",
        (since,),
    )
    by_model = await db.fetch_all(
        """SELECT model, SUM(cost_usd) as cost
           FROM cost_records WHERE created_at >= ?
           GROUP BY model""",
        (since,),
    )

    return {
        "daily_breakdown": [
            {"date": row["date_key"], "cost": round(float(row["cost"]), 4), "tokens": row["tokens"]}
            for row in daily
        ],
        "model_breakdown": [
            {"model": row["model"], "cost": round(float(row["cost"]), 4)} for row in by_model
        ],
    }
