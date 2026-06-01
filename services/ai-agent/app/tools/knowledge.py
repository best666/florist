"""RAG knowledge base search tool using ChromaDB vector store."""

from __future__ import annotations

import logging

from app.tools.registry import tool_registry

logger = logging.getLogger(__name__)


@tool_registry.register(
    name="search_plant_knowledge",
    description="搜索植物养护知识库，包括品种信息、浇水施肥技巧、病虫害防治、季节性养护建议等。用于回答用户养护问题时提供科学依据。",
)
async def search_plant_knowledge(query: str, plant_category: str | None = None, season: str | None = None) -> dict:
    """Search the plant care knowledge base for relevant information.

    Falls back to structured local data if ChromaDB is not available.
    """
    # Try ChromaDB vector search first
    try:
        from app.vector.retriever import get_retriever
        retriever = get_retriever()
        if retriever.is_available:
            results = await retriever.search(query, top_k=5, filters={
                "category": plant_category,
                "season": season,
            })
            return {
                "query": query,
                "source": "vector_search",
                "results": results,
                "count": len(results),
            }
    except Exception as e:
        logger.warning("Vector search unavailable, using local fallback: %s", e)

    # Local fallback: keyword-based search in bundled knowledge
    results = _local_knowledge_search(query, plant_category, season)
    return {
        "query": query,
        "source": "local_fallback",
        "results": results,
        "count": len(results),
    }


def _local_knowledge_search(query: str, plant_category: str | None, season: str | None) -> list[dict]:
    """Simple keyword-based fallback search in local knowledge base."""
    # Basic plant care knowledge snippets
    snippets = [
        {
            "title": "浇水通用原则",
            "content": "大多数室内植物遵循「见干见湿」原则：等盆土表面干了再浇透水，避免天天浇一点。可以用手指插入土中2-3厘米感受干湿。冬季减少浇水频率，夏季增加。",
            "category": "watering",
        },
        {
            "title": "施肥基本原则",
            "content": "生长期(春夏季)每月施肥1-2次，休眠期(冬季)停止施肥。薄肥勤施，避免浓肥烧根。观叶植物用氮肥为主的复合肥，开花植物在花前增施磷钾肥。",
            "category": "fertilizing",
        },
        {
            "title": "光照需求分类",
            "content": "喜光植物(多肉、仙人掌、三角梅)需要每天4-6小时直射光；耐阴植物(龟背竹、绿萝、虎皮兰)适合明亮的散射光；喜阴植物(蕨类、竹芋)应避免直射光。",
            "category": "lighting",
        },
        {
            "title": "常见叶片发黄原因",
            "content": "老叶发黄脱落可能是正常代谢；新叶发黄可能是缺铁或光照不足；叶缘发黄干枯可能是缺水或空气太干；整株发黄且叶片软塌可能是浇水过多烂根。",
            "category": "diagnosis",
        },
        {
            "title": "多肉植物养护要点",
            "content": "多肉喜欢充足光照和通风干燥的环境。用颗粒土(颗粒占比50-70%)，浇水等叶片稍微发皱再浇透。夏季高温时适当遮阴控水，冬季5°C以下入室防冻。",
            "category": "succulent",
        },
        {
            "title": "红蜘蛛防治",
            "content": "红蜘蛛在高温干燥环境易爆发。初期可用湿布擦拭叶片正反面；严重时喷施阿维菌素或联苯肼酯，3-5天一次连喷3次。平时多喷水增加湿度可预防。",
            "category": "pest_control",
        },
        {
            "title": "夏季养护要点",
            "content": "夏季高温时避免正午浇水，最好在清晨或傍晚浇水。适当遮阴防止晒伤。加强通风降低病虫害风险。多肉和球根类植物注意控水防黑腐。",
            "category": "seasonal",
        },
        {
            "title": "冬季养护要点",
            "content": "冬季减少浇水频率和停止施肥。怕冷的植物移入室内(保持5°C以上)。远离暖气风口和冷风直吹处。用温水浇花避免冷水刺激根系。",
            "category": "seasonal",
        },
    ]

    query_lower = query.lower()
    results = []
    for s in snippets:
        content_lower = s["content"].lower()
        title_lower = s["title"].lower()
        score = 0

        # Simple keyword scoring
        keywords = query_lower.split()
        for kw in keywords:
            if kw in title_lower:
                score += 3
            if kw in content_lower:
                score += 1

        # Category filter
        if plant_category and plant_category.lower() in s.get("category", "").lower():
            score += 2
        if season and season.lower() in content_lower:
            score += 2

        if score > 0:
            results.append({**s, "relevance_score": score})

    results.sort(key=lambda r: r["relevance_score"], reverse=True)
    return results[:5]
