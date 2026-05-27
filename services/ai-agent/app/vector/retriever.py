"""RAG retriever: hybrid vector + keyword search with result fusion."""

from __future__ import annotations

import logging
from typing import Any

from app.vector.client import get_chroma_client

logger = logging.getLogger(__name__)


class RAGRetriever:
    """Semantic search across the plant knowledge base using ChromaDB."""

    def __init__(self) -> None:
        self._client = get_chroma_client()
        self._collection_name = "plant_knowledge"

    @property
    def is_available(self) -> bool:
        return self._client is not None

    async def search(self, query: str, top_k: int = 5, filters: dict | None = None) -> list[dict[str, Any]]:
        """Search the knowledge base for relevant documents."""
        if not self._client:
            return []

        try:
            collection = self._get_or_create_collection()
            results = collection.query(
                query_texts=[query],
                n_results=top_k,
                where=self._build_filter(filters),
            )

            documents = []
            if results.get("documents") and results["documents"][0]:
                for i, doc in enumerate(results["documents"][0]):
                    meta = results["metadatas"][0][i] if results.get("metadatas") else {}
                    distance = results["distances"][0][i] if results.get("distances") else 0
                    documents.append({
                        "content": doc,
                        "metadata": meta,
                        "score": 1.0 - min(distance, 1.0) if distance else 1.0,
                    })
            return documents

        except Exception as e:
            logger.warning("Vector search failed: %s", e)
            return []

    def _get_or_create_collection(self):
        try:
            return self._client.get_collection(self._collection_name)
        except Exception:
            return self._client.create_collection(
                name=self._collection_name,
                metadata={"description": "Plant care knowledge base"},
            )

    @staticmethod
    def _build_filter(filters: dict | None) -> dict | None:
        if not filters:
            return None
        where: dict[str, Any] = {}
        if filters.get("category"):
            where["category"] = filters["category"]
        if filters.get("season"):
            where["season"] = filters["season"]
        return where if where else None


# Singleton
_retriever: RAGRetriever | None = None


def get_retriever() -> RAGRetriever:
    global _retriever
    if _retriever is None:
        _retriever = RAGRetriever()
    return _retriever
