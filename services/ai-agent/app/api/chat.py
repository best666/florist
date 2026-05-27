"""Chat endpoints for conversational AI."""

from __future__ import annotations

import logging
import time
import uuid

from fastapi import APIRouter, Depends, HTTPException, Request

from app.agent.types import AgentContext
from app.api.deps import get_agent, verify_api_key
from app.api.schemas import ChatRequest, ChatResponse
from app.analytics.collector import (
    chat_cache_hits_total,
    chat_duration_seconds,
    chat_requests_total,
    chat_tokens_total,
)

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/chat", tags=["chat"])


@router.post("", response_model=ChatResponse)
async def chat(
    payload: ChatRequest,
    request: Request,
    api_key: str = Depends(verify_api_key),
) -> ChatResponse:
    """Send a message to the Florist AI agent and get a response."""
    agent = await get_agent(request)

    ctx = AgentContext(
        user_id=payload.user_id,
        session_id=f"session_{uuid.uuid4().hex[:8]}",
        conversation_id=payload.conversation_id,
        skill=payload.skill,
        message=payload.message,
        attachments=payload.attachments,
    )

    try:
        response = await agent.chat(ctx)

        # Update metrics
        chat_requests_total.labels(status="success", skill=response.skill_used or "none").inc()
        chat_duration_seconds.observe(time.monotonic() - getattr(request.state, "start_time", time.monotonic()))
        chat_tokens_total.labels(type="input", model=response.model).inc(response.tokens_input)
        chat_tokens_total.labels(type="output", model=response.model).inc(response.tokens_output)
        if response.tokens_cached > 0:
            chat_cache_hits_total.inc()

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
            compression_triggered=response.compression_triggered,
            generated_at=response.generated_at,
        )
    except Exception as e:
        logger.error("Chat failed: %s", e)
        chat_requests_total.labels(status="error", skill="none").inc()
        raise HTTPException(status_code=500, detail=f"Agent error: {str(e)}")


@router.get("/history")
async def get_history(
    request: Request,
    user_id: str,
    limit: int = 20,
    api_key: str = Depends(verify_api_key),
) -> list[dict]:
    """Get conversation history for a user."""
    db = request.app.state.memory_db
    rows = await db.fetch_all(
        """SELECT id, title, skill, message_count, created_at, updated_at
           FROM conversations WHERE user_id = ? ORDER BY updated_at DESC LIMIT ?""",
        (user_id, limit),
    )
    return [dict(row) for row in rows]


@router.get("/{conversation_id}")
async def get_conversation(
    request: Request,
    conversation_id: str,
    api_key: str = Depends(verify_api_key),
) -> dict:
    """Get full message history for a specific conversation."""
    db = request.app.state.memory_db
    rows = await db.fetch_all(
        "SELECT role, content, compressed, created_at FROM messages WHERE conversation_id = ? ORDER BY created_at ASC",
        (conversation_id,),
    )
    return {
        "conversation_id": conversation_id,
        "messages": [dict(row) for row in rows],
        "count": len(rows),
    }


@router.delete("/{conversation_id}")
async def delete_conversation(
    request: Request,
    conversation_id: str,
    api_key: str = Depends(verify_api_key),
) -> dict:
    """Delete a conversation and all its messages."""
    db = request.app.state.memory_db
    await db.execute("DELETE FROM messages WHERE conversation_id = ?", (conversation_id,))
    await db.execute("DELETE FROM conversation_summaries WHERE conversation_id = ?", (conversation_id,))
    await db.execute("DELETE FROM conversations WHERE id = ?", (conversation_id,))
    await db.commit()
    return {"deleted": True, "conversation_id": conversation_id}
