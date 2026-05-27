"""Agent-specific type definitions."""

from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime
from typing import Any, Literal

from pydantic import BaseModel, Field


class AgentConfig(BaseModel):
    """Runtime configuration for the agent."""

    model: str = "claude-sonnet-4-20250514"
    max_tokens: int = 4096
    max_tool_rounds: int = 8
    temperature: float = 0.6
    enable_thinking: bool = False
    thinking_budget_tokens: int = 1024


@dataclass
class AgentContext:
    """Full context for a single agent invocation."""

    user_id: str
    session_id: str
    conversation_id: str | None = None
    skill: str | None = None
    message: str = ""
    attachments: list[dict] = field(default_factory=list)

    # Populated during execution
    user_memories: dict[str, str] = field(default_factory=dict)
    episodic_memories: list[str] = field(default_factory=list)
    procedural_templates: list[dict] = field(default_factory=list)
    knowledge_snippets: list[str] = field(default_factory=list)
    plant_count: int = 0


class ToolCallRecord(BaseModel):
    """Record of a single tool invocation."""

    tool_name: str
    args: dict[str, Any]
    result_summary: str
    duration_ms: int
    success: bool
    error_message: str | None = None


class AgentResponse(BaseModel):
    """Final response from the agent after processing."""

    conversation_id: str
    reply: str
    tool_calls: list[ToolCallRecord] = Field(default_factory=list)
    tokens_input: int = 0
    tokens_output: int = 0
    tokens_cached: int = 0
    model: str = ""
    cost_estimate: float = 0.0
    skill_used: str | None = None
    compression_triggered: bool = False
    generated_at: str = Field(default_factory=lambda: datetime.now().isoformat())
