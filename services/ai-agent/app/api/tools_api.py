"""Tool discovery and structured AI endpoints for backend integration."""

from __future__ import annotations

import logging

from fastapi import APIRouter, Depends, HTTPException

from app.agent.engine import AgentEngine
from app.agent.types import AgentContext
from app.api.deps import get_agent_engine
from app.api.schemas import ChatResponse
from app.tools.registry import tool_registry

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/tools", tags=["tools"])


@router.get("")
async def list_tools():
    """返回 Agent 所有可用工具及输入 schema，供后端发现和调用。"""
    tools = tool_registry.get_anthropic_tools()
    return {
        "tools": tools,
        "count": len(tools),
    }


@router.post("/moderate")
async def moderate_content(
    body: dict,
    engine: AgentEngine = Depends(get_agent_engine),
):
    """AI 内容审核 —— 检查反馈/评论是否合规。

    Request: { "content": "用户提交的内容", "user_id": "xxx" }
    Response: { "passed": true/false, "reason": "驳回原因（若未通过）" }
    """
    content = body.get("content", "")
    user_id = body.get("user_id", "anonymous")

    if not content or len(content) < 2:
        return {"passed": True}

    ctx = AgentContext(
        user_id=user_id,
        message=f"请审核以下用户内容是否合规。\n\n合规标准：\n- 不包含侮辱性、攻击性语言\n- 不包含广告、垃圾信息、联系方式\n- 内容应与植物养护或应用体验相关\n\n用户内容：{content}\n\n请用 JSON 回复：{{\"passed\": true}} 或 {{\"passed\": false, \"reason\": \"具体原因\"}}",
        skill="moderation",
    )

    try:
        response = await engine.chat(ctx)

        import json
        import re
        reply = response.reply.strip()
        json_match = re.search(r'\{[^{}]*"passed"[^{}]*\}', reply)
        if json_match:
            result = json.loads(json_match.group(0))
            return {
                "passed": result.get("passed", True),
                "reason": result.get("reason"),
            }

        return {"passed": True}
    except Exception as e:
        logger.warning("Moderation via agent failed: %s", e)
        return {"passed": True}
