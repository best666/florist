"""Knowledge base document indexer for ChromaDB."""

from __future__ import annotations

import json
import logging
from pathlib import Path

from app.vector.client import get_chroma_client
from app.vector.embeddings import embed_texts

logger = logging.getLogger(__name__)

DATA_DIR = Path(__file__).parent.parent.parent / "data"


async def index_knowledge_base() -> None:
    """Index all knowledge base documents into ChromaDB collections."""
    client = get_chroma_client()
    if not client:
        logger.warning("Cannot index: ChromaDB unavailable")
        return

    await _index_collection(client, "plant_knowledge", DATA_DIR / "plants" / "care_guides.json")
    await _index_collection(client, "pest_disease", DATA_DIR / "plants" / "pests.json")
    await _index_collection(client, "seasonal_tips", DATA_DIR / "seasonal" / "tips.json")
    logger.info("Knowledge base indexing complete")


async def _index_collection(client, collection_name: str, data_file: Path) -> None:
    """Index a single JSON data file into a ChromaDB collection."""
    if not data_file.exists():
        logger.info("Data file not found for %s: %s", collection_name, data_file)
        return

    try:
        data = json.loads(data_file.read_text())
        documents = data if isinstance(data, list) else data.get("documents", [])

        if not documents:
            return

        # Get or create collection
        try:
            collection = client.get_collection(collection_name)
            if collection.count() > 0:
                logger.info("Collection '%s' already has %d docs, skipping", collection_name, collection.count())
                return
        except Exception:
            collection = client.create_collection(collection_name)

        # Batch index
        batch_size = 50
        for i in range(0, len(documents), batch_size):
            batch = documents[i : i + batch_size]
            texts = [d.get("content", d.get("text", str(d))) for d in batch]
            ids = [f"{collection_name}_{i + j}" for j in range(len(batch))]
            metadatas = [{k: v for k, v in d.items() if k not in ("content", "text")} for d in batch]

            embeddings = await embed_texts(texts)

            collection.add(
                ids=ids,
                documents=texts,
                embeddings=embeddings,
                metadatas=metadatas,
            )

        logger.info("Indexed %d documents into '%s'", len(documents), collection_name)

    except Exception as e:
        logger.error("Failed to index %s: %s", collection_name, e)
