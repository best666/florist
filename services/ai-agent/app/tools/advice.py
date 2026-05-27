"""Daily care advice generation tool."""

from __future__ import annotations

import logging
from datetime import datetime

from app.db import mysql_manager
from app.db.queries import get_care_records_for_flower, get_user_flowers
from app.tools.registry import tool_registry
from app.tools.weather import get_weather as fetch_weather

logger = logging.getLogger(__name__)


@tool_registry.register(
    name="generate_daily_advice",
    description="为用户生成今天的植物养护建议。综合天气数据和用户所有植物的状态，生成个性化每日提醒。优先关注需要浇水的植物和需要防护极端天气的户外植物。",
)
async def generate_daily_advice(user_id: str, city_name: str | None = None) -> dict:
    """Generate daily care advice for a user based on plants and weather."""
    if not mysql_manager.is_available:
        await mysql_manager.initialize()

    if not mysql_manager.is_available:
        return {"error": "无法连接到植物数据库", "advice": []}

    # Get plants
    plants = await get_user_flowers(user_id)
    if not plants:
        return {"message": "你还没有添加植物哦，添加第一盆植物后我就可以为你生成每日养护建议啦。", "advice": [], "weather": None}

    # Determine city
    resolved_city = city_name or "北京"

    # Get weather
    weather = await fetch_weather(resolved_city)
    if "error" in weather:
        weather = {"city_name": resolved_city, "weather_text": "未知", "temperature": 20, "humidity": 60, "precipitation_probability": 0, "wind_speed": 0}

    # Build per-plant priority
    plant_priorities = []
    for row in plants:
        status = row.get("careStatus", "healthy")
        placement = row.get("placement", "")
        name = row.get("nickname") or row["name"]
        plant_id = row["id"]

        priority = "normal"
        urgent_reasons = []

        if status == "watering-needed":
            priority = "high"
            urgent_reasons.append("需要浇水")
        elif status == "fertilizing-needed":
            priority = "medium"
            urgent_reasons.append("建议施肥")

        if placement == "outdoor_open_air":
            temp = weather.get("temperature", 20)
            precip = weather.get("precipitation_probability", 0)
            if temp >= 35:
                priority = "high"
                urgent_reasons.append("高温暴晒风险")
            elif temp <= 5:
                priority = "high"
                urgent_reasons.append("低温冻伤风险")
            elif precip >= 80:
                priority = "high"
                urgent_reasons.append("暴雨积水风险")

        if status == "healthy" and priority == "normal":
            priority = "low"

        records = await get_care_records_for_flower(plant_id, limit=1)
        last_action = records[0] if records else None

        plant_priorities.append({
            "plant_id": plant_id,
            "plant_name": name,
            "category": row.get("category", ""),
            "placement": row.get("placement", ""),
            "status": status,
            "priority": priority,
            "urgent_reasons": urgent_reasons,
            "last_watered": row.get("lastWateredAt"),
            "last_action": {
                "type": last_action["actionType"],
                "time": str(last_action["createdAt"]),
            } if last_action else None,
        })

    plant_priorities.sort(key=lambda p: {"high": 0, "medium": 1, "normal": 2, "low": 3}[p["priority"]])

    return {
        "date": datetime.now().strftime("%Y-%m-%d"),
        "city_name": resolved_city,
        "weather": weather,
        "total_plants": len(plants),
        "urgent_count": sum(1 for p in plant_priorities if p["priority"] == "high"),
        "plant_priorities": plant_priorities,
        "context_for_agent": "请基于以上数据，用温柔的语气为用户生成今日养护提醒。优先关注高优先级的植物，对极端天气给出明确建议。",
    }
