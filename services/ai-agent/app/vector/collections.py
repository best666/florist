"""ChromaDB collection definitions and management."""

from __future__ import annotations

import logging

from app.vector.client import get_chroma_client

logger = logging.getLogger(__name__)

COLLECTIONS = {
    "plant_knowledge": {
        "description": "植物养护知识库 — 品种信息、浇水施肥技巧、光照需求、土壤要求",
        "expected_size": 5000,
    },
    "pest_disease": {
        "description": "病虫害图鉴 — 症状描述、成因分析、治疗方案、预防措施",
        "expected_size": 2000,
    },
    "user_conversations": {
        "description": "用户对话历史语义索引 — 对话摘要向量、问题-解决方案对",
        "expected_size": "dynamic",
    },
    "seasonal_tips": {
        "description": "季节性养护知识 — 节气养护、换季注意事项、极端天气应对",
        "expected_size": 500,
    },
}


def ensure_collections() -> None:
    """Ensure all required collections exist in ChromaDB."""
    client = get_chroma_client()
    if not client:
        logger.warning("Cannot ensure collections: ChromaDB unavailable")
        return

    for name, meta in COLLECTIONS.items():
        try:
            client.get_collection(name)
            logger.debug("Collection '%s' exists", name)
        except Exception:
            client.create_collection(
                name=name,
                metadata={"description": meta["description"]},
            )
            logger.info("Created collection '%s'", name)
