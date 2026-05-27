"""Plant diagnosis endpoint."""

from __future__ import annotations

import logging
import uuid

from fastapi import APIRouter, Depends, HTTPException, Request

from app.agent.types import AgentContext
from app.api.deps import get_agent, verify_api_key
from app.api.schemas import ChatResponse, DiagnosisRequest
from app.analytics.collector import chat_requests_total

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/diagnosis", tags=["diagnosis"])


@router.post("/plant", response_model=ChatResponse)
async def diagnose_plant(
    payload: DiagnosisRequest,
    request: Request,
    api_key: str = Depends(verify_api_key),
) -> ChatResponse:
    """Diagnose plant health issues from symptoms and optional image."""
    agent = await get_agent(request)

    message = f"请帮我诊断这株植物的问题。症状描述：{payload.symptoms}"
    attachments = []
    if payload.image_data_url:
        attachments.append({"type": "image", "data_url": payload.image_data_url})

    ctx = AgentContext(
        user_id=payload.user_id,
        session_id=f"diag_{uuid.uuid4().hex[:8]}",
        skill="plant_diagnosis",
        message=message,
        attachments=attachments,
    )

    try:
        response = await agent.chat(ctx)
        chat_requests_total.labels(status="success", skill="plant_diagnosis").inc()

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
        logger.error("Diagnosis failed: %s", e)
        raise HTTPException(status_code=500, detail=str(e))
