"""Audit event models."""

from __future__ import annotations

from datetime import datetime
from enum import StrEnum
from typing import Any, Literal

from pydantic import BaseModel, Field


class AuditEventType(StrEnum):
    CHAT = "chat"
    TOOL_CALL = "tool_call"
    ADVICE_GENERATION = "advice_generation"
    DIAGNOSIS = "diagnosis"
    MEMORY_OPERATION = "memory_operation"
    SECURITY_EVENT = "security_event"
    SYSTEM = "system"


class AuditEvent(BaseModel):
    event_id: str
    timestamp: datetime = Field(default_factory=datetime.now)
    event_type: AuditEventType

    user_id: str | None = None
    session_id: str = ""
    conversation_id: str | None = None
    request_id: str = ""
    ip_address: str | None = None

    action: str = ""
    resource: str = ""
    resource_id: str | None = None

    status: Literal["success", "failed", "blocked", "warned"] = "success"
    error_message: str | None = None
    duration_ms: int = 0

    model: str = ""
    tokens_input: int = 0
    tokens_output: int = 0
    tokens_cached: int = 0
    cost_estimate: float = 0.0
    tool_calls: list[dict[str, Any]] = Field(default_factory=list)

    security_flags: list[str] = Field(default_factory=list)
    risk_score: float | None = None

    metadata: dict[str, Any] = Field(default_factory=dict)
