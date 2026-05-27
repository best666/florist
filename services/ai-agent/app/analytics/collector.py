"""Prometheus metrics collector for the Florist AI agent."""

from __future__ import annotations

from prometheus_client import Counter, Gauge, Histogram, generate_latest, REGISTRY

# Chat metrics
chat_requests_total = Counter(
    "florist_chat_requests_total",
    "Total chat requests",
    ["status", "skill"],
)
chat_duration_seconds = Histogram(
    "florist_chat_duration_seconds",
    "Chat request duration",
    buckets=[0.5, 1.0, 2.0, 5.0, 10.0, 20.0, 30.0],
)
chat_tokens_total = Counter(
    "florist_chat_tokens_total",
    "Total tokens consumed",
    ["type", "model"],
)
chat_cache_hits_total = Counter(
    "florist_chat_cache_hits_total",
    "Prompt cache hits",
)

# Tool call metrics
tool_calls_total = Counter(
    "florist_tool_calls_total",
    "Total tool calls",
    ["tool_name", "status"],
)
tool_call_duration_seconds = Histogram(
    "florist_tool_call_duration_seconds",
    "Tool call duration",
    ["tool_name"],
    buckets=[0.05, 0.1, 0.25, 0.5, 1.0, 2.0, 5.0],
)

# Security metrics
security_blocks_total = Counter(
    "florist_security_blocks_total",
    "Total security blocks",
    ["reason"],
)
injection_attempts_total = Counter(
    "florist_injection_attempts_total",
    "Prompt injection attempts detected",
)

# Cost metrics
cost_total_usd = Counter(
    "florist_cost_total_usd",
    "Total cost in USD",
    ["model"],
)

# User metrics
active_users = Gauge(
    "florist_active_users",
    "Currently active users",
)


def get_metrics() -> bytes:
    """Generate Prometheus metrics in text format."""
    return generate_latest(REGISTRY)
