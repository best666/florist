"""Knowledge base loader: loads plant care data from JSON files and indexes into ChromaDB."""

from __future__ import annotations

import json
import logging
from pathlib import Path

from app.vector.indexer import index_knowledge_base

logger = logging.getLogger(__name__)

DATA_DIR = Path(__file__).parent.parent.parent / "data"


def load_plant_guides() -> list[dict]:
    """Load plant care guides from JSON file."""
    path = DATA_DIR / "plants" / "care_guides.json"
    if not path.exists():
        return []
    return json.loads(path.read_text())


def load_pests() -> list[dict]:
    """Load pest and disease data from JSON file."""
    path = DATA_DIR / "plants" / "pests.json"
    if not path.exists():
        return []
    return json.loads(path.read_text())


def load_seasonal_tips() -> list[dict]:
    """Load seasonal care tips from JSON file."""
    path = DATA_DIR / "seasonal" / "tips.json"
    if not path.exists():
        return []
    return json.loads(path.read_text())


async def initialize_knowledge_base() -> None:
    """Initialize the knowledge base by indexing all data into ChromaDB."""
    logger.info("Initializing knowledge base...")
    await index_knowledge_base()
    logger.info("Knowledge base initialization complete")
