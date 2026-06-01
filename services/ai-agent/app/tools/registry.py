"""Central tool registry with decorator-based registration and policy enforcement."""

from __future__ import annotations

import logging
import time
from collections import defaultdict
from typing import Any, Callable

from pydantic import BaseModel

logger = logging.getLogger(__name__)


class ToolDef(BaseModel):
    name: str
    description: str
    input_schema: dict
    handler: Callable
    policy: dict | None = None

    class Config:
        arbitrary_types_allowed = True


class ToolRegistry:
    """Registry for all agent tools. Tools are registered via decorator and dispatched by name."""

    def __init__(self) -> None:
        self._tools: dict[str, ToolDef] = {}
        self._call_counts: dict[str, int] = defaultdict(int)
        self._window_starts: dict[str, float] = defaultdict(lambda: time.monotonic())

    def register(
        self,
        name: str,
        description: str,
        input_model: type[BaseModel] | None = None,
        policy: dict | None = None,
    ) -> Callable:
        """Decorator to register a tool function.

        Args:
            name: Unique tool name (used in Anthropic tool_use blocks).
            description: Human-readable description shown to the LLM.
            input_model: Optional Pydantic model for input validation.
            policy: Tool access policy dict (rate_limit, require_user_id, cost_tier, etc.).
        """

        def decorator(func: Callable) -> Callable:
            schema = (
                input_model.model_json_schema()
                if input_model
                else {"type": "object", "properties": {}, "required": []}
            )
            self._tools[name] = ToolDef(
                name=name,
                description=description,
                input_schema=schema,
                handler=func,
                policy=policy,
            )
            logger.info("Registered tool: %s", name)
            return func

        return decorator

    def get_tool(self, name: str) -> ToolDef | None:
        return self._tools.get(name)

    def get_anthropic_tools(self, active_tool_names: list[str] | None = None) -> list[dict]:
        """Return tools in Anthropic Messages API format."""
        tools = []
        for name, tool in self._tools.items():
            if active_tool_names is None or name in active_tool_names:
                tools.append({
                    "name": tool.name,
                    "description": tool.description,
                    "input_schema": tool.input_schema,
                })
        return tools

    def get_openai_tools(self, active_tool_names: list[str] | None = None) -> list[dict]:
        """Return tools in OpenAI function-calling format."""
        tools = []
        for name, tool in self._tools.items():
            if active_tool_names is None or name in active_tool_names:
                tools.append({
                    "type": "function",
                    "function": {
                        "name": tool.name,
                        "description": tool.description,
                        "parameters": tool.input_schema,
                    },
                })
        return tools

    def check_policy(self, name: str, user_id: str | None) -> bool:
        """Check if a tool can be invoked based on its policy."""
        tool = self._tools.get(name)
        if not tool:
            return False

        policy = tool.policy or {}

        if policy.get("require_user_id") and not user_id:
            logger.warning("Tool %s requires user_id but none provided", name)
            return False

        rate_limit = policy.get("rate_limit")
        if rate_limit:
            limit, window_sec = self._parse_rate_limit(rate_limit)
            now = time.monotonic()
            window_key = f"{name}"
            if now - self._window_starts[window_key] > window_sec:
                self._window_starts[window_key] = now
                self._call_counts[window_key] = 0
            if self._call_counts[window_key] >= limit:
                logger.warning("Tool %s rate limit exceeded: %d/%d in %ds", name, self._call_counts[window_key], limit, window_sec)
                return False
            self._call_counts[window_key] += 1

        return True

    async def execute(self, name: str, args: dict, user_id: str | None = None) -> Any:
        """Execute a tool by name with argument validation and policy check."""
        tool = self.get_tool(name)
        if not tool:
            raise ValueError(f"Unknown tool: {name}")

        if not self.check_policy(name, user_id):
            raise PermissionError(f"Tool {name} is not allowed (policy violation)")

        start = time.monotonic()
        try:
            result = await tool.handler(**args)
            duration_ms = int((time.monotonic() - start) * 1000)
            logger.info("Tool %s executed in %dms", name, duration_ms)
            return result
        except Exception as e:
            duration_ms = int((time.monotonic() - start) * 1000)
            logger.error("Tool %s failed after %dms: %s", name, duration_ms, e)
            raise

    @staticmethod
    def _parse_rate_limit(rate_str: str) -> tuple[int, int]:
        """Parse rate limit string like '30/min' into (limit, window_seconds)."""
        parts = rate_str.split("/")
        limit = int(parts[0])
        unit = parts[1] if len(parts) > 1 else "min"
        if unit == "sec":
            return limit, 1
        if unit == "min":
            return limit, 60
        if unit == "hour":
            return limit, 3600
        return limit, 60

    @property
    def tool_names(self) -> list[str]:
        return list(self._tools.keys())


# Global singleton registry
tool_registry = ToolRegistry()
