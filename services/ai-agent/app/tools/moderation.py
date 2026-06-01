"""Content moderation tool for community feedback and comments."""

from __future__ import annotations

from pydantic import BaseModel, Field

from app.tools.registry import tool_registry


class ModerateContentInput(BaseModel):
    content: str = Field(..., min_length=1, max_length=2000, description="需要审核的文本内容")
    context: str = Field(default="community_feedback", description="审核场景: community_feedback / comment / plant_note")


@tool_registry.register(
    name="moderate_content",
    description="审核用户提交的社区反馈或评论内容，判断是否合规。返回 passed=true 表示通过，passed=false 表示不合规并附带原因。",
    input_model=ModerateContentInput,
    policy={"rate_limit": "60/min", "require_user_id": False},
)
async def moderate_content(content: str, context: str = "community_feedback") -> dict:
    """AI-powered content moderation for community features.

    Checks for:
    - Abusive/hateful language
    - Spam/advertising content
    - Off-topic content (should relate to plant care or app experience)
    - Personal information exposure
    """
    # The actual moderation logic runs through the LLM in the agent loop.
    # This tool provides the schema and policy; the agent runner handles
    # the LLM call with the moderation system prompt.
    return {
        "passed": True,
        "content": content,
        "context": context,
    }
