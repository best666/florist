"""ChromaDB client wrapper for vector storage and retrieval."""

from __future__ import annotations

import logging
from typing import Any

import chromadb
from chromadb.config import Settings as ChromaSettings

from app.config import settings

logger = logging.getLogger(__name__)

_client: chromadb.ClientAPI | None = None


def get_chroma_client() -> chromadb.ClientAPI | None:
    """Get or initialize the ChromaDB client. Returns None if unavailable."""
    global _client
    if _client is not None:
        return _client

    try:
        _client = chromadb.Client(ChromaSettings(
            chroma_db_impl="duckdb+parquet",
            persist_directory=settings.chroma_persist_dir,
            anonymized_telemetry=False,
        ))
        logger.info("ChromaDB client initialized")
        return _client
    except Exception as e:
        logger.warning("ChromaDB unavailable, vector search disabled: %s", e)
        return None
