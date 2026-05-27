"""Tool-level security constraints and access policies."""

from __future__ import annotations

from pydantic import BaseModel, Field


class ToolPolicy(BaseModel):
    """Access policy for a tool."""

    require_user_id: bool = True
    max_params_length: int = 2000
    rate_limit: str = "30/min"
    cost_tier: str = "low"  # low / medium / high
    require_content_filter: bool = False
    sensitive_key_patterns: list[str] = Field(default_factory=list)
    allowed_roles: list[str] = Field(default_factory=lambda: ["user", "assistant"])


# Default policies per tool
TOOL_POLICIES: dict[str, ToolPolicy] = {
    "get_user_plants": ToolPolicy(
        require_user_id=True,
        rate_limit="30/min",
        cost_tier="low",
    ),
    "get_plant_detail": ToolPolicy(
        require_user_id=True,
        rate_limit="30/min",
        cost_tier="low",
    ),
    "get_care_history": ToolPolicy(
        require_user_id=True,
        rate_limit="20/min",
        cost_tier="low",
    ),
    "get_weather": ToolPolicy(
        require_user_id=False,
        rate_limit="20/min",
        cost_tier="low",
    ),
    "diagnose_plant": ToolPolicy(
        require_user_id=True,
        rate_limit="5/min",
        cost_tier="high",
        require_content_filter=True,
    ),
    "generate_daily_advice": ToolPolicy(
        require_user_id=True,
        rate_limit="10/min",
        cost_tier="medium",
    ),
    "search_plant_knowledge": ToolPolicy(
        require_user_id=False,
        rate_limit="30/min",
        cost_tier="low",
    ),
    "get_user_memory": ToolPolicy(
        require_user_id=True,
        rate_limit="30/min",
        cost_tier="low",
    ),
    "save_user_memory": ToolPolicy(
        require_user_id=True,
        rate_limit="20/min",
        cost_tier="low",
        max_params_length=2000,
        sensitive_key_patterns=["password", "token", "key", "secret", "credential"],
    ),
}


def get_tool_policy(tool_name: str) -> ToolPolicy:
    return TOOL_POLICIES.get(tool_name, ToolPolicy())
