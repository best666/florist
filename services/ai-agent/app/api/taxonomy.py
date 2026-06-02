"""Plant taxonomy suggestion endpoint."""

from __future__ import annotations

import json
import logging
from pathlib import Path
from typing import Literal

from fastapi import APIRouter, Depends, HTTPException

from app.api.deps import verify_api_key
from app.api.schemas import TaxonomySuggestRequest, TaxonomySuggestResponse

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/taxonomy", tags=["taxonomy"])

# Load static care guides for tier-1 matching
DATA_DIR = Path(__file__).resolve().parent.parent.parent / "data" / "plants"
_care_guides_cache: list[dict] | None = None


def _load_care_guides() -> list[dict]:
    global _care_guides_cache
    if _care_guides_cache is None:
        try:
            path = DATA_DIR / "care_guides.json"
            if path.exists():
                _care_guides_cache = json.loads(path.read_text(encoding="utf-8"))
            else:
                _care_guides_cache = []
        except Exception:
            _care_guides_cache = []
    return _care_guides_cache


def _static_match(plant_name: str) -> dict | None:
    """Tier 1: match plant name against care_guides.json."""
    guides = _load_care_guides()
    name_lower = plant_name.strip().lower()
    for guide in guides:
        guide_name = guide.get("name", "").lower()
        if guide_name in name_lower or name_lower in guide_name:
            return {
                "category": guide.get("category", "herbaceous"),
                "placement": "indoor_balcony",
                "care_difficulty": "easy",
                "care_status": "healthy",
                "confidence": "high",
            }
    return None


@router.post("/suggest", response_model=TaxonomySuggestResponse)
async def suggest_taxonomy(
    payload: TaxonomySuggestRequest,
    api_key: str = Depends(verify_api_key),
) -> TaxonomySuggestResponse:
    """Suggest plant taxonomy based on plant name."""
    plant_name = payload.plant_name.strip()

    if not plant_name:
        raise HTTPException(status_code=400, detail="植物名称不能为空")

    # Tier 1: static match from care guides
    static_result = _static_match(plant_name)
    if static_result:
        return TaxonomySuggestResponse(**static_result)

    # Tier 2: simple heuristic fallback
    # Common Chinese plant name patterns → category
    name = plant_name
    if any(kw in name for kw in ["多肉", "玉露", "仙人", "生石花", "熊童子"]):
        category = "succulent"
    elif any(kw in name for kw in ["水培", "水草", "水仙", "荷花", "睡莲"]):
        category = "hydroponic"
    elif any(kw in name for kw in ["爬藤", "藤", "蔓", "绿萝", "常春藤", "牵牛"]):
        category = "vine"
    elif any(kw in name for kw in ["树", "木", "榕", "松", "柏", "桂", "梅", "桃"]):
        category = "woody"
    else:
        category = "herbaceous"

    return TaxonomySuggestResponse(
        category=category,
        placement="indoor_balcony",
        care_difficulty="easy",
        care_status="healthy",
        confidence="medium",
    )
