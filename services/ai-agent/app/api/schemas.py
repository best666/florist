"""Pydantic request/response models for the API."""

from __future__ import annotations

from datetime import datetime
from typing import Any, Literal

from pydantic import BaseModel, Field


class ChatRequest(BaseModel):
    user_id: str = Field(..., description="User ID from the main app")
    message: str = Field(..., min_length=1, max_length=4000, description="User message text")
    conversation_id: str | None = Field(None, description="Existing conversation ID for multi-turn")
    skill: str | None = Field(None, description="Explicitly requested skill")
    attachments: list[dict[str, Any]] = Field(default_factory=list, description="Image attachments as [{type:'image', data_url:'...'}]")
    city_name: str | None = Field(None, description="User's current city for weather context")


class ChatResponse(BaseModel):
    conversation_id: str
    reply: str
    tool_calls: list[dict[str, Any]] = Field(default_factory=list)
    tokens_input: int = 0
    tokens_output: int = 0
    tokens_cached: int = 0
    model: str = ""
    cost_estimate: float = 0.0
    skill_used: str | None = None
    compression_triggered: bool = False
    generated_at: str = Field(default_factory=lambda: datetime.now().isoformat())


class DailyAdviceRequest(BaseModel):
    user_id: str
    city_name: str | None = None
    force_refresh: bool = False


class DailyAdviceResponse(BaseModel):
    user_id: str
    date: str
    city_name: str
    weather: dict[str, Any] = Field(default_factory=dict)
    daily_summary: str = ""
    plant_advices: list[dict[str, Any]] = Field(default_factory=list)
    generated_at: str = Field(default_factory=lambda: datetime.now().isoformat())


class DiagnosisRequest(BaseModel):
    user_id: str
    plant_id: str | None = None
    symptoms: str = Field(..., min_length=1, max_length=2000)
    image_data_url: str | None = None
    weather: dict[str, Any] | None = None


class DiagnosisResponse(BaseModel):
    diagnosis_title: str = ""
    summary: str = ""
    severity: Literal["low", "medium", "high"] = "low"
    confidence_label: str = ""
    symptom_highlights: list[str] = Field(default_factory=list)
    possible_causes: list[str] = Field(default_factory=list)
    treatment_steps: list[str] = Field(default_factory=list)
    prevention_tips: list[str] = Field(default_factory=list)
    observation_tips: list[str] = Field(default_factory=list)
    generated_at: str = Field(default_factory=lambda: datetime.now().isoformat())


class TripPlanRequest(BaseModel):
    user_id: str
    plant_id: str
    travel_days: int = Field(..., ge=1, le=30)
    city_name: str | None = None


class AnalyzeRequest(BaseModel):
    user_id: str
    focus: str | None = None  # 'watering_schedule', 'health_overview', etc.


class MemoryResponse(BaseModel):
    user_id: str
    memories: dict[str, str]
    count: int


class MemoryUpdateRequest(BaseModel):
    key: str
    value: str


class OverviewResponse(BaseModel):
    period: str
    total_conversations: int
    total_messages: int
    active_users: int
    total_cost_usd: float
    successful_requests: int
    blocked_requests: int


class ErrorResponse(BaseModel):
    error: str
    detail: str | None = None


class TaxonomySuggestRequest(BaseModel):
    plant_name: str = Field(..., min_length=1, max_length=80)


class TaxonomySuggestResponse(BaseModel):
    category: str = "herbaceous"
    placement: str = "indoor_balcony"
    care_difficulty: str = "easy"
    care_status: str = "healthy"
    confidence: Literal["high", "medium", "low"] = "medium"
