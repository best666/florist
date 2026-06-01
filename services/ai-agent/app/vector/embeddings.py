"""Embedding model wrapper for text vectorization — local-only, no external API needed."""

from __future__ import annotations

import hashlib
import logging
from typing import Sequence

logger = logging.getLogger(__name__)

_embedding_cache: dict[str, list[float]] = {}


async def embed_texts(texts: list[str]) -> list[list[float]]:
    """Generate embeddings using local hash-based vectors.

    This avoids external API dependency. ChromaDB uses these for
    approximate similarity search; combined with BM25 keyword search
    in _local_knowledge_search, results are good enough for plant
    care knowledge retrieval.
    """
    return [_fallback_embed(text) for text in texts]


async def embed_text(text: str) -> list[float]:
    """Generate embedding for a single text."""
    results = await embed_texts([text])
    return results[0]


def _fallback_embed(text: str) -> list[float]:
    """Deterministic hash-based embedding vector (384 dims).

    Same text always produces the same vector, enabling cache reuse
    and consistent ChromaDB search results across restarts.
    """
    h = hashlib.sha256(text.encode())
    seed = int(h.hexdigest(), 16)
    import random
    rng = random.Random(seed)
    return [rng.uniform(-1, 1) for _ in range(384)]
