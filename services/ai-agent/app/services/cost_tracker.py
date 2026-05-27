"""Token cost tracking and budget management."""

from __future__ import annotations

import logging
from datetime import datetime

from anthropic.types import Usage

from app.config import settings
from app.memory.db import MemoryDatabase

logger = logging.getLogger(__name__)

# Pricing per million tokens (USD)
PRICING: dict[str, dict[str, float]] = {
    "claude-haiku-3-5-20241022": {
        "input": 0.80,
        "output": 4.00,
        "cache_write": 1.00,
        "cache_read": 0.08,
    },
    "claude-sonnet-4-20250514": {
        "input": 3.00,
        "output": 15.00,
        "cache_write": 3.75,
        "cache_read": 0.30,
    },
    "claude-sonnet-4": {
        "input": 3.00,
        "output": 15.00,
        "cache_write": 3.75,
        "cache_read": 0.30,
    },
}


class CostTracker:
    """Tracks token usage and calculates costs per user."""

    def __init__(self, db: MemoryDatabase) -> None:
        self._db = db

    async def track_call(self, user_id: str, model: str, usage: Usage) -> float:
        """Record a single API call and return its cost in USD."""
        pricing = PRICING.get(model, PRICING["claude-sonnet-4"])

        cache_write = getattr(usage, "cache_creation_input_tokens", 0) or 0
        cache_read = getattr(usage, "cache_read_input_tokens", 0) or 0
        regular_input = usage.input_tokens - cache_write - cache_read

        cost = (
            regular_input * pricing["input"] / 1_000_000
            + usage.output_tokens * pricing["output"] / 1_000_000
            + cache_write * pricing["cache_write"] / 1_000_000
            + cache_read * pricing["cache_read"] / 1_000_000
        )

        try:
            today = datetime.now().strftime("%Y-%m-%d")
            await self._db.execute(
                """INSERT INTO cost_records (user_id, date_key, model, tokens_input, tokens_output, tokens_cached, cost_usd)
                   VALUES (?, ?, ?, ?, ?, ?, ?)""",
                (user_id, today, model, usage.input_tokens, usage.output_tokens, cache_read, round(cost, 6)),
            )
            await self._db.commit()
        except Exception as e:
            logger.debug("Cost record skipped: %s", e)

        logger.debug("API call cost: $%.6f (model=%s, tokens_in=%d, tokens_out=%d, cache_read=%d)",
                      cost, model, usage.input_tokens, usage.output_tokens, cache_read)
        return cost

    async def get_daily_cost(self, user_id: str, date_key: str | None = None) -> float:
        """Get total cost for a user on a given day."""
        date_key = date_key or datetime.now().strftime("%Y-%m-%d")
        try:
            row = await self._db.fetch_one(
                "SELECT SUM(cost_usd) as total FROM cost_records WHERE user_id = ? AND date_key = ?",
                (user_id, date_key),
            )
            return float(row["total"]) if row and row["total"] else 0.0
        except Exception:
            return 0.0

    async def check_budget(self, user_id: str) -> bool:
        """Check if user is within their daily budget."""
        daily_cost = await self.get_daily_cost(user_id)
        return daily_cost < settings.daily_budget_per_user_usd
