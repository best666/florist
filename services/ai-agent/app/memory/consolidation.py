"""Memory consolidation: migrate short-term memories to long-term storage."""

from __future__ import annotations

import logging

from app.agent.types import AgentContext
from app.memory.db import MemoryDatabase

logger = logging.getLogger(__name__)


async def consolidate_turn(
    db: MemoryDatabase,
    ctx: AgentContext,
    reply: str,
    importance_score: float,
) -> None:
    """Consolidate a conversation turn into long-term memory if it's important enough."""
    if importance_score >= 0.7:
        # Save to episodic memory as a summary
        summary = f"用户问: {ctx.message[:200]} | 回复: {reply[:200]}"
        await db.execute(
            """INSERT INTO episodic_memory (user_id, session_id, summary, importance)
               VALUES (?, ?, ?, ?)""",
            (ctx.user_id, ctx.conversation_id, summary, importance_score),
        )

        # If very important, extract potential semantic memories
        if importance_score >= 0.8:
            await _extract_semantic_memories(db, ctx, reply)

        await db.commit()
        logger.info("Memory consolidated: user=%s, importance=%.2f", ctx.user_id, importance_score)


async def _extract_semantic_memories(db: MemoryDatabase, ctx: AgentContext, reply: str) -> None:
    """Extract user preferences and plant notes from the conversation turn."""
    combined = ctx.message + " " + reply

    # Simple heuristic extraction for common patterns
    patterns = {
        "gardening_experience": [
            ("我是新手", "beginner"),
            ("刚开始养", "beginner"),
            ("养了很多年", "expert"),
            ("老手", "expert"),
            ("有一定经验", "intermediate"),
        ],
        "watering_style": [
            ("喜欢少浇水", "infrequent"),
            ("经常浇水", "frequent"),
            ("见干见湿", "standard"),
        ],
        "preferred_city": [],  # Extracted from weather tool calls
    }

    for key, rules in patterns.items():
        for pattern, value in rules:
            if pattern in combined:
                await db.execute(
                    """INSERT INTO user_memory (user_id, key, value, importance, updated_at)
                       VALUES (?, ?, ?, 0.8, datetime('now'))
                       ON CONFLICT(user_id, key) DO UPDATE
                       SET value = ?, importance = MAX(importance, 0.8), updated_at = datetime('now')""",
                    (ctx.user_id, key, value, value),
                )
