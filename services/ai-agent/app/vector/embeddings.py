"""Embedding model wrapper for text vectorization."""

from __future__ import annotations

import hashlib
import logging
from typing import Sequence

from openai import AsyncOpenAI

from app.config import settings

logger = logging.getLogger(__name__)

_client: AsyncOpenAI | None = None
_embedding_cache: dict[str, list[float]] = {}


def _get_client() -> AsyncOpenAI | None:
    global _client
    if _client is not None:
        return _client
    if not settings.openai_api_key:
        logger.warning("OpenAI API key not configured, embeddings disabled")
        return None
    _client = AsyncOpenAI(api_key=settings.openai_api_key)
    return _client


async def embed_texts(texts: list[str]) -> list[list[float]]:
    """Generate embeddings for a list of texts."""
    client = _get_client()
    if not client:
        # Fallback: use a simple hash-based "embedding" for demo purposes
        return [_fallback_embed(text) for text in texts]

    # Check cache
    uncached = []
    uncached_indices = []
    results = [None] * len(texts)
    for i, text in enumerate(texts):
        cache_key = hashlib.md5(text.encode()).hexdigest()
        if cache_key in _embedding_cache:
            results[i] = _embedding_cache[cache_key]
        else:
            uncached.append(text)
            uncached_indices.append(i)

    if not uncached:
        return results  # type: ignore[return-value]

    try:
        response = await client.embeddings.create(
            model=settings.embedding_model,
            input=uncached,
        )
        for idx, embedding_data in zip(uncached_indices, response.data):
            emb = embedding_data.embedding
            results[idx] = emb
            cache_key = hashlib.md5(uncached[uncached_indices.index(idx) % len(uncached)].encode()).hexdigest()
            _embedding_cache[cache_key] = emb
    except Exception as e:
        logger.warning("Embedding generation failed: %s, using fallback", e)
        for i, text in enumerate(texts):
            if results[i] is None:
                results[i] = _fallback_embed(text)

    return results  # type: ignore[return-value]


async def embed_text(text: str) -> list[float]:
    """Generate embedding for a single text."""
    results = await embed_texts([text])
    return results[0]


def _fallback_embed(text: str) -> list[float]:
    """Simple hash-based fallback embedding (NOT for production use)."""
    h = hashlib.sha256(text.encode())
    # Generate a 384-dim pseudo-embedding from hash
    seed = int(h.hexdigest(), 16)
    import random
    rng = random.Random(seed)
    return [rng.uniform(-1, 1) for _ in range(384)]
