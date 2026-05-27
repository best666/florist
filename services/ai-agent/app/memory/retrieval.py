"""Hybrid memory retrieval: combines keyword matching, semantic search, and importance ranking."""

from __future__ import annotations

import logging

from app.memory.db import MemoryDatabase

logger = logging.getLogger(__name__)


class MemoryRetriever:
    """Retrieves memories using hybrid approach (keyword + semantic + importance)."""

    def __init__(self, db: MemoryDatabase) -> None:
        self._db = db

    async def retrieve(
        self,
        user_id: str,
        query: str,
        top_k: int = 10,
        memory_types: list[str] | None = None,
    ) -> list[dict]:
        """Retrieve the most relevant memories for a given query.

        Args:
            user_id: The user to retrieve memories for.
            query: The current user message used for relevance matching.
            top_k: Maximum number of memories to return.
            memory_types: Filter by memory type ('semantic', 'episodic', 'procedural').
        """
        results: list[dict] = []

        # 1. Semantic memories (key-value) — always included
        if not memory_types or "semantic" in memory_types:
            semantic = await self._db.fetch_all(
                "SELECT key, value, importance FROM user_memory WHERE user_id = ? ORDER BY importance DESC",
                (user_id,),
            )
            for row in semantic:
                results.append({
                    "type": "semantic",
                    "key": row["key"],
                    "content": row["value"],
                    "importance": row["importance"],
                    "relevance": self._keyword_relevance(query, f"{row['key']} {row['value']}"),
                })

        # 2. Episodic memories (conversation summaries)
        if not memory_types or "episodic" in memory_types:
            episodic = await self._db.fetch_all(
                "SELECT id, summary, importance, created_at FROM episodic_memory WHERE user_id = ? ORDER BY importance DESC, created_at DESC LIMIT 20",
                (user_id,),
            )
            for row in episodic:
                relevance = self._keyword_relevance(query, row["summary"])
                if relevance > 0:
                    results.append({
                        "type": "episodic",
                        "key": f"episode_{row['id']}",
                        "content": row["summary"],
                        "importance": row["importance"],
                        "relevance": relevance,
                    })

        # 3. Procedural memories (care templates)
        if not memory_types or "procedural" in memory_types:
            procedural = await self._db.fetch_all(
                "SELECT id, template_name, description, success_count FROM procedural_memory WHERE user_id = ? ORDER BY success_count DESC",
                (user_id,),
            )
            for row in procedural:
                relevance = self._keyword_relevance(query, f"{row['template_name']} {row['description']}")
                if relevance > 0:
                    results.append({
                        "type": "procedural",
                        "key": row["template_name"],
                        "content": row["description"],
                        "importance": min(row["success_count"] / 10, 1.0),
                        "relevance": relevance,
                    })

        # Sort by combined score: relevance * 0.6 + importance * 0.4
        results.sort(
            key=lambda r: r.get("relevance", 0) * 0.6 + r.get("importance", 0) * 0.4,
            reverse=True,
        )
        return results[:top_k]

    @staticmethod
    def _keyword_relevance(query: str, content: str) -> float:
        """Simple keyword-based relevance scoring."""
        query_lower = query.lower()
        content_lower = content.lower()

        if not query_lower or not content_lower:
            return 0.0

        # Split query into keywords
        keywords = [kw for kw in query_lower.split() if len(kw) >= 1]
        if not keywords:
            return 0.0

        matches = sum(1 for kw in keywords if kw in content_lower)
        return matches / len(keywords)
