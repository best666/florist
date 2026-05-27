"""Weather query tool using Open-Meteo API."""

from __future__ import annotations

import hashlib
import logging
import time
from typing import Any

import httpx

from app.tools.registry import tool_registry

logger = logging.getLogger(__name__)

GEOCODING_URL = "https://geocoding-api.open-meteo.com/v1/search"
FORECAST_URL = "https://api.open-meteo.com/v1/forecast"

WMO_WEATHER_TEXTS: dict[int, str] = {
    0: "晴朗", 1: "大部晴朗", 2: "多云", 3: "阴天",
    45: "有雾", 48: "有雾凇",
    51: "小毛毛雨", 53: "毛毛雨", 55: "大毛毛雨",
    61: "小雨", 63: "中雨", 65: "大雨",
    71: "小雪", 73: "中雪", 75: "大雪",
    80: "阵雨", 81: "中等阵雨", 82: "大阵雨",
    95: "雷暴", 96: "雷暴伴小冰雹", 99: "雷暴伴大冰雹",
}

# Simple in-memory cache
_cache: dict[str, tuple[float, Any]] = {}


def _cache_key(city_name: str) -> str:
    return f"weather:{hashlib.sha256(city_name.encode()).hexdigest()[:16]}"


def _get_cached(city_name: str, ttl_sec: int = 900) -> Any | None:
    key = _cache_key(city_name)
    if key in _cache:
        ts, val = _cache[key]
        if time.monotonic() - ts < ttl_sec:
            return val
    return None


def _set_cache(city_name: str, val: Any) -> None:
    _cache[_cache_key(city_name)] = (time.monotonic(), val)


@tool_registry.register(
    name="get_weather",
    description="获取指定城市的当前天气信息，包括温度、湿度、降水概率、风速和天气描述。用于判断是否适合浇水、施肥或需要防护极端天气。",
)
async def get_weather(city_name: str) -> dict:
    """Get current weather for a city using Open-Meteo API."""
    cached = _get_cached(city_name)
    if cached:
        return cached

    async with httpx.AsyncClient(timeout=10) as client:
        # Geocoding
        geo_resp = await client.get(GEOCODING_URL, params={
            "name": city_name,
            "count": 1,
            "language": "zh",
            "format": "json",
        })
        geo_resp.raise_for_status()
        geo_data = geo_resp.json()

        results = geo_data.get("results", [])
        if not results:
            return {"error": f"未找到城市: {city_name}", "city_name": city_name}

        city = results[0]

        # Forecast
        forecast_resp = await client.get(FORECAST_URL, params={
            "latitude": city["latitude"],
            "longitude": city["longitude"],
            "current": ["temperature_2m", "relative_humidity_2m", "precipitation_probability", "wind_speed_10m", "weather_code"],
            "timezone": city.get("timezone", "Asia/Shanghai"),
            "forecast_days": 1,
        })
        forecast_resp.raise_for_status()
        forecast_data = forecast_resp.json()

        current = forecast_data.get("current", {})
        weather_code = current.get("weather_code", 0)

        result = {
            "city_name": city.get("name", city_name),
            "country": city.get("country", ""),
            "admin1": city.get("admin1", ""),
            "temperature": current.get("temperature_2m", 0),
            "humidity": current.get("relative_humidity_2m", 0),
            "precipitation_probability": current.get("precipitation_probability", 0),
            "wind_speed": current.get("wind_speed_10m", 0),
            "weather_code": weather_code,
            "weather_text": WMO_WEATHER_TEXTS.get(weather_code, "未知"),
        }

        _set_cache(city_name, result)
        return result
