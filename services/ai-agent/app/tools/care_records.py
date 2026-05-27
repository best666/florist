"""Care record query tools."""

from __future__ import annotations

import logging

from app.constants.enums import ACTION_LABELS
from app.db import mysql_manager
from app.db.queries import get_care_records_for_user, get_care_records_for_flower
from app.tools.registry import tool_registry

logger = logging.getLogger(__name__)


@tool_registry.register(
    name="get_care_history",
    description="获取用户的养护操作历史记录。可以指定植物ID获取单株植物的记录，或通过用户ID获取所有植物的记录。返回浇水、施肥、修剪等操作的时间和备注。用于分析养护习惯和植物状态变化。",
)
async def get_care_history(user_id: str | None = None, plant_id: str | None = None, limit: int = 20) -> dict:
    """Get care action history for a plant or user."""
    if not mysql_manager.is_available:
        await mysql_manager.initialize()

    if not mysql_manager.is_available:
        return {"error": "无法连接到数据库", "records": []}

    if plant_id:
        rows = await get_care_records_for_flower(plant_id, limit)
    elif user_id:
        rows = await get_care_records_for_user(user_id, limit)
    else:
        return {"error": "请提供 user_id 或 plant_id", "records": []}

    records = [
        {
            "id": r["id"],
            "flower_id": r.get("flowerId", ""),
            "flower_name": r.get("flowerName", ""),
            "action_type": r["actionType"],
            "action_label": ACTION_LABELS.get(r["actionType"], r["actionType"]),
            "note": r.get("note") or None,
            "created_at": str(r["createdAt"]),
        }
        for r in rows
    ]

    return {
        "total": len(records),
        "records": records,
    }
