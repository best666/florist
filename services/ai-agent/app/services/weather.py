"""Open-Meteo weather API client. Shared by both tools and services."""

from __future__ import annotations

import logging

logger = logging.getLogger(__name__)

# Weather is handled directly in app/tools/weather.py via Open-Meteo API.
# This module can be extended for additional weather service features
# like multi-day forecasts, UV index, soil temperature, etc.
