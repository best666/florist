"""Daily advice and trip plan endpoints."""

from __future__ import annotations

import json
import logging
import time
import uuid

from fastapi import APIRouter, Depends, HTTPException, Request

from app.agent.types import AgentContext
from app.api.deps import get_agent, verify_api_key
from app.api.schemas import (
    AnalyzeRequest,
    ChatResponse,
    DailyAdviceRequest,
    DailyAdviceResponse,
    TripPlanRequest,
)
from app.analytics.collector import chat_requests_total

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/advice", tags=["advice"])


@router.post("/daily", response_model=DailyAdviceResponse)
async def daily_advice(
    payload: DailyAdviceRequest,
    request: Request,
    api_key: str = Depends(verify_api_key),
) -> DailyAdviceResponse:
    """Generate daily plant care advice based on weather and user's plants."""
    agent = await get_agent(request)

    # Check cache first
    from datetime import datetime
    today = datetime.now().strftime("%Y-%m-%d")

    if not payload.force_refresh:
        db = request.app.state.memory_db
        cached = await db.fetch_one(
            "SELECT advice_json FROM daily_advice_cache WHERE user_id = ? AND date_key = ?",
            (payload.user_id, today),
        )
        if cached:
            data = json.loads(cached["advice_json"])
            return DailyAdviceResponse(**data)

    ctx = AgentContext(
        user_id=payload.user_id,
        session_id=f"daily_{uuid.uuid4().hex[:8]}",
        skill="daily_advice",
        message="请为我生成今日植物养护建议",
    )

    try:
        response = await agent.chat(ctx)
        chat_requests_total.labels(status="success", skill="daily_advice").inc()

        result = DailyAdviceResponse(
            user_id=payload.user_id,
            date=today,
            city_name=payload.city_name or "未知",
            daily_summary=response.reply,
            plant_advices=[],
        )

        # Cache the result
        db = request.app.state.memory_db
        await db.execute(
            """INSERT INTO daily_advice_cache (user_id, date_key, city_name, advice_json)
               VALUES (?, ?, ?, ?)
               ON CONFLICT(user_id, date_key) DO UPDATE SET advice_json = ?""",
            (payload.user_id, today, payload.city_name, result.model_dump_json(), result.model_dump_json()),
        )
        await db.commit()

        return result
    except Exception as e:
        logger.error("Daily advice failed: %s", e)
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/trip-plan")
async def trip_plan(
    payload: TripPlanRequest,
    request: Request,
    api_key: str = Depends(verify_api_key),
) -> ChatResponse:
    """Generate a trip care plan for unattended plants."""
    agent = await get_agent(request)

    ctx = AgentContext(
        user_id=payload.user_id,
        session_id=f"trip_{uuid.uuid4().hex[:8]}",
        skill="trip_care_plan",
        message=f"我要出差 {payload.travel_days} 天，请为我的植物 {payload.plant_id} 生成托管方案",
    )

    try:
        response = await agent.chat(ctx)
        chat_requests_total.labels(status="success", skill="trip_care_plan").inc()

        return ChatResponse(
            conversation_id=response.conversation_id,
            reply=response.reply,
            tool_calls=[tc.model_dump() for tc in response.tool_calls],
            tokens_input=response.tokens_input,
            tokens_output=response.tokens_output,
            tokens_cached=response.tokens_cached,
            model=response.model,
            cost_estimate=response.cost_estimate,
            skill_used=response.skill_used,
        )
    except Exception as e:
        logger.error("Trip plan failed: %s", e)
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/analyze", response_model=ChatResponse)
async def analyze_garden(
    payload: AnalyzeRequest,
    request: Request,
    api_key: str = Depends(verify_api_key),
) -> ChatResponse:
    """Comprehensive garden analysis."""
    agent = await get_agent(request)

    message = "请对我的花园做全面分析"
    if payload.focus:
        message += f"，重点关注{payload.focus}"

    ctx = AgentContext(
        user_id=payload.user_id,
        session_id=f"analyze_{uuid.uuid4().hex[:8]}",
        skill="plant_analysis",
        message=message,
    )

    try:
        response = await agent.chat(ctx)
        chat_requests_total.labels(status="success", skill="plant_analysis").inc()

        return ChatResponse(
            conversation_id=response.conversation_id,
            reply=response.reply,
            tool_calls=[tc.model_dump() for tc in response.tool_calls],
            tokens_input=response.tokens_input,
            tokens_output=response.tokens_output,
            tokens_cached=response.tokens_cached,
            model=response.model,
            cost_estimate=response.cost_estimate,
            skill_used=response.skill_used,
        )
    except Exception as e:
        logger.error("Garden analysis failed: %s", e)
        raise HTTPException(status_code=500, detail=str(e))
