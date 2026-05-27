"""Context compression: summarizes long conversations to manage token limits."""

from __future__ import annotations

import json
import logging

import anthropic

from app.config import settings
from app.memory.db import MemoryDatabase

logger = logging.getLogger(__name__)

# Compression thresholds
MSG_COUNT_THRESHOLD = 20
TOKEN_ESTIMATE_THRESHOLD = 8000

# Max messages to keep uncompressed
KEEP_RECENT_COUNT = 8


class ContextCompressor:
    """Compresses long conversation histories into structured summaries."""

    def __init__(self, client: anthropic.AsyncAnthropic, db: MemoryDatabase) -> None:
        self._client = client
        self._db = db

    async def needs_compression(self, conversation_id: str) -> bool:
        """Check if a conversation needs compression."""
        try:
            row = await self._db.fetch_one(
                "SELECT COUNT(*) as cnt, SUM(token_count) as total_tokens FROM messages WHERE conversation_id = ? AND compressed = 0",
                (conversation_id,),
            )
            if not row:
                return False
            msg_count = row["cnt"] or 0
            total_tokens = row["total_tokens"] or msg_count * 200  # rough estimate
            return msg_count > MSG_COUNT_THRESHOLD or total_tokens > TOKEN_ESTIMATE_THRESHOLD
        except Exception:
            return False

    async def compress(self, conversation_id: str, user_id: str) -> str:
        """Compress a conversation and return the summary for inclusion in the system prompt."""
        try:
            # Get uncompressed messages
            rows = await self._db.fetch_all(
                "SELECT id, role, content FROM messages WHERE conversation_id = ? AND compressed = 0 ORDER BY created_at ASC",
                (conversation_id,),
            )

            if len(rows) <= KEEP_RECENT_COUNT:
                return ""

            # Split into "to compress" and "to keep"
            to_compress = rows[:-KEEP_RECENT_COUNT]
            to_keep = rows[-KEEP_RECENT_COUNT:]

            # Build compression prompt
            messages_text = "\n".join(
                f"[{r['role']}]: {r['content'][:500]}" for r in to_compress
            )

            response = await self._client.messages.create(
                model=settings.anthropic_simple_model,  # Use Haiku for cost efficiency
                max_tokens=800,
                temperature=0.3,
                system="你是一个对话摘要工具。请用中文提取以下对话的关键信息，按 JSON 格式输出。",
                messages=[{
                    "role": "user",
                    "content": f"""请将以下对话压缩为结构化摘要，输出 JSON：

{messages_text}

JSON 格式：
{{
    "summary": "用2-3句话概括这段对话的主要内容",
    "topics": ["话题1", "话题2"],
    "key_decisions": ["决定1", "决定2"],
    "user_preferences": ["偏好1"] ,
    "plant_status_changes": ["变化1"]
}}""",
                }],
            )

            text_block = next(b for b in response.content if b.type == "text")
            raw = text_block.text

            try:
                summary_data = json.loads(raw if raw.strip().startswith("{") else raw[raw.index("{") : raw.rindex("}") + 1])
            except (json.JSONDecodeError, ValueError):
                summary_data = {"summary": raw[:500], "topics": [], "key_decisions": [], "user_preferences": [], "plant_status_changes": []}

            summary_text = summary_data.get("summary", raw[:500])

            # Save summary to DB
            await self._db.execute(
                """INSERT INTO conversation_summaries
                   (conversation_id, summary, topics, message_range_start, message_range_end)
                   VALUES (?, ?, ?, ?, ?)""",
                (
                    conversation_id,
                    summary_text,
                    json.dumps(summary_data.get("topics", []), ensure_ascii=False),
                    to_compress[0]["id"] if to_compress else 0,
                    to_compress[-1]["id"] if to_compress else 0,
                ),
            )

            # Mark old messages as compressed
            msg_ids = [r["id"] for r in to_compress]
            if msg_ids:
                placeholders = ",".join("?" for _ in msg_ids)
                await self._db.execute(
                    f"UPDATE messages SET compressed = 1 WHERE id IN ({placeholders})",
                    tuple(msg_ids),
                )

            # Also save to episodic memory
            await self._db.execute(
                "INSERT INTO episodic_memory (user_id, summary, topics, importance) VALUES (?, ?, ?, 0.6)",
                (user_id, summary_text, json.dumps(summary_data.get("topics", []), ensure_ascii=False)),
            )

            await self._db.commit()
            logger.info("Compressed conversation %s: %d messages → summary", conversation_id, len(to_compress))

            return summary_text

        except Exception as e:
            logger.error("Compression failed: %s", e)
            return ""
