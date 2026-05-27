"""Plant query tools for accessing user's flower data from MySQL."""

from __future__ import annotations

import logging

from app.constants.enums import ACTION_LABELS, CATEGORY_LABELS, PLACEMENT_LABELS
from app.db import mysql_manager
from app.db.queries import (
    get_care_records_for_flower,
    get_flower_detail,
    get_flower_images,
    get_user_flowers,
)
from app.tools.registry import tool_registry

logger = logging.getLogger(__name__)


def _map_flower(row: dict) -> dict:
    """Map raw DB row to a clean plant dict for the agent."""
    return {
        "id": row["id"],
        "name": row["name"],
        "nickname": row.get("nickname") or None,
        "category": row.get("category", ""),
        "category_label": CATEGORY_LABELS.get(row.get("category", ""), row.get("category", "")),
        "placement": row.get("placement", ""),
        "placement_label": PLACEMENT_LABELS.get(row.get("placement", ""), row.get("placement", "")),
        "care_difficulty": row.get("careDifficulty", ""),
        "care_status": row.get("careStatus", ""),
        "note": row.get("note") or None,
        "last_watered_at": row.get("lastWateredAt") or None,
        "last_fertilized_at": row.get("lastFertilizedAt") or None,
        "cover_image_url": row.get("coverImageUrl") or None,
    }


@tool_registry.register(
    name="get_user_plants",
    description="获取用户的所有植物列表。返回每株植物的基本信息：名称、品种分类、摆放位置、养护难度、当前状态(是否需要浇水/健康/休眠/需要施肥)、上次浇水/施肥时间。用于了解用户的花园概况。",
)
async def get_user_plants(user_id: str) -> dict:
    """Get all non-deleted plants for a user."""
    if not mysql_manager.is_available:
        await mysql_manager.initialize()

    if not mysql_manager.is_available:
        return {"error": "无法连接到植物数据库，请稍后再试", "plants": [], "total": 0}

    rows = await get_user_flowers(user_id)
    plants = [_map_flower(row) for row in rows]

    status_counts = {
        "watering_needed": sum(1 for p in plants if p["care_status"] == "watering-needed"),
        "healthy": sum(1 for p in plants if p["care_status"] == "healthy"),
        "dormant": sum(1 for p in plants if p["care_status"] == "dormant"),
        "fertilizing_needed": sum(1 for p in plants if p["care_status"] == "fertilizing-needed"),
    }

    return {
        "total": len(plants),
        "status_summary": status_counts,
        "plants": plants,
    }


@tool_registry.register(
    name="get_plant_detail",
    description="获取单株植物的详细信息，包括图片和最近的养护记录。用于深入了解某株特定植物的状态和历史。",
)
async def get_plant_detail(plant_id: str) -> dict:
    """Get detailed information about a specific plant."""
    if not mysql_manager.is_available:
        await mysql_manager.initialize()

    if not mysql_manager.is_available:
        return {"error": "无法连接到植物数据库"}

    plant = await get_flower_detail(plant_id)
    if not plant:
        return {"error": f"未找到植物: {plant_id}"}

    images = await get_flower_images(plant_id)
    records = await get_care_records_for_flower(plant_id, limit=10)

    recent_records = [
        {
            "action_type": r["actionType"],
            "action_label": ACTION_LABELS.get(r["actionType"], r["actionType"]),
            "note": r.get("note") or None,
            "created_at": str(r["createdAt"]),
        }
        for r in records
    ]

    return {
        **_map_flower(plant),
        "images": [{"url": img["url"], "compressed_url": img.get("compressedUrl")} for img in images],
        "recent_records": recent_records,
        "record_count": len(recent_records),
    }
