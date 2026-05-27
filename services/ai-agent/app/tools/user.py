"""User memory read/write tools for persistent preference storage."""

from __future__ import annotations

import logging

from app.config import settings
from app.memory.db import MemoryDatabase
from app.tools.registry import tool_registry

logger = logging.getLogger(__name__)


def _get_memory_db() -> MemoryDatabase:
    """Lazy import to avoid circular imports."""
    from app.main import app
    return app.state.memory_db


@tool_registry.register(
    name="get_user_memory",
    description="读取用户的长期记忆，包括偏好设置、植物笔记、养护习惯等。用于在对话中回忆用户之前告诉过你的信息，提供更个性化的服务。",
)
async def get_user_memory(user_id: str, keys: list[str] | None = None) -> dict:
    """Retrieve stored user preferences and plant notes."""
    db = _get_memory_db()

    if keys:
        placeholders = ",".join("?" for _ in keys)
        rows = await db.fetch_all(
            f"SELECT key, value, importance FROM user_memory WHERE user_id = ? AND key IN ({placeholders})",
            (user_id, *keys),
        )
    else:
        rows = await db.fetch_all(
            "SELECT key, value, importance FROM user_memory WHERE user_id = ? ORDER BY importance DESC",
            (user_id,),
        )

    memories = {row["key"]: row["value"] for row in rows}
    return {"user_id": user_id, "memories": memories, "count": len(memories)}


@tool_registry.register(
    name="save_user_memory",
    description="保存用户的重要信息到长期记忆。当你了解到用户的偏好、习惯、植物名称、养护技巧等信息时，应该调用此工具保存，以便下次对话时使用。不要保存临时信息或敏感数据。",
)
async def save_user_memory(user_id: str, key: str, value: str) -> dict:
    """Save user preferences or plant notes to persistent memory."""
    db = _get_memory_db()

    if len(value) > 2000:
        value = value[:2000]

    await db.execute(
        """INSERT INTO user_memory (user_id, key, value, updated_at)
           VALUES (?, ?, ?, datetime('now'))
           ON CONFLICT(user_id, key) DO UPDATE SET value = ?, updated_at = datetime('now')""",
        (user_id, key, value, value),
    )
    await db.commit()

    logger.info("Saved memory: user=%s, key=%s", user_id, key)
    return {"saved": True, "user_id": user_id, "key": key}
