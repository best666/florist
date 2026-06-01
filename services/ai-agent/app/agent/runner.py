"""AgentRunner: executes the LLM API message loop with tool/function calling.

Supports both Anthropic (Claude) and OpenAI-compatible (DeepSeek) backends.
Selects backend based on LLM_BACKEND config: 'anthropic' or 'openai'.
"""

from __future__ import annotations

import json
import logging
import time
from typing import Any

from app.agent.types import AgentConfig, ToolCallRecord
from app.tools.registry import ToolRegistry

logger = logging.getLogger(__name__)

MAX_TOOL_RESULT_CHARS = 4000


def _summarize_result(result: Any, max_chars: int = MAX_TOOL_RESULT_CHARS) -> str:
    if isinstance(result, str):
        text = result
    elif isinstance(result, (dict, list)):
        text = json.dumps(result, ensure_ascii=False, indent=2, default=str)
    else:
        text = str(result)
    if len(text) <= max_chars:
        return text
    return text[:max_chars] + f"\n\n... (truncated, total {len(text)} chars)"


class AgentRunner:
    """Handles the LLM API message loop with tool/function calling."""

    def __init__(self, tool_registry: ToolRegistry) -> None:
        self._tools = tool_registry
        self._config = AgentConfig()

    def configure(self, config: AgentConfig) -> None:
        self._config = config

    async def run(
        self,
        system_prompt: str,
        messages: list[dict],
        active_tools: list[str] | None,
        user_id: str | None = None,
        client: Any = None,
    ) -> tuple[str, list[ToolCallRecord], Any | None]:
        """Execute the agent loop."""
        from app.config import settings

        if settings.llm_backend == "openai":
            return await self._run_openai(system_prompt, messages, active_tools, user_id, client)
        else:
            return await self._run_anthropic(system_prompt, messages, active_tools, user_id, client)

    # ── Anthropic backend ──

    async def _run_anthropic(
        self,
        system_prompt: str,
        messages: list[dict],
        active_tools: list[str] | None,
        user_id: str | None,
        client: Any,
    ) -> tuple[str, list[ToolCallRecord], Any | None]:
        import anthropic

        tool_defs = self._tools.get_anthropic_tools(active_tools) if active_tools else None
        tool_calls: list[ToolCallRecord] = []
        usage_total = None

        for round_idx in range(self._config.max_tool_rounds):
            api_kwargs: dict[str, Any] = {
                "model": self._config.model,
                "max_tokens": self._config.max_tokens,
                "system": system_prompt,
                "messages": messages,
                "temperature": self._config.temperature,
            }
            if tool_defs:
                api_kwargs["tools"] = tool_defs

            response = await client.messages.create(**api_kwargs)
            if response.usage:
                usage_total = response.usage

            messages.append({
                "role": "assistant",
                "content": [b.model_dump() if hasattr(b, "model_dump") else b for b in response.content],
            })

            if response.stop_reason == "end_turn":
                text_blocks = [b for b in response.content if b.type == "text"]
                return "\n".join(b.text for b in text_blocks), tool_calls, usage_total

            if response.stop_reason == "tool_use":
                results = await self._execute_anthropic_tools(response, tool_calls, user_id)
                messages.append({"role": "user", "content": results})
                continue

            text_blocks = [b for b in response.content if b.type == "text"]
            return "\n".join(b.text for b in text_blocks) if text_blocks else "...", tool_calls, usage_total

        return "请求涉及的操作较多，请简化问题。", tool_calls, usage_total

    async def _execute_anthropic_tools(self, response, tool_calls, user_id) -> list[dict]:
        import anthropic
        results: list[dict] = []
        for block in response.content:
            if block.type != "tool_use":
                continue
            tool_start = time.monotonic()
            tc = await self._call_tool(block.name, block.input if isinstance(block.input, dict) else {}, user_id)
            duration_ms = int((time.monotonic() - tool_start) * 1000)
            tool_calls.append(ToolCallRecord(
                tool_name=block.name, args=block.input, result_summary=tc["result"][:300],
                duration_ms=duration_ms, success=tc["success"], error_message=tc.get("error"),
            ))
            results.append({"type": "tool_result", "tool_use_id": block.id, "content": tc["result"]})
        return results

    # ── OpenAI-compatible backend ──

    async def _run_openai(
        self,
        system_prompt: str,
        messages: list[dict],
        active_tools: list[str] | None,
        user_id: str | None,
        client: Any,
    ) -> tuple[str, list[ToolCallRecord], Any | None]:
        tool_defs = self._tools.get_openai_tools(active_tools) if active_tools else None
        tool_calls: list[ToolCallRecord] = []
        usage_total = None

        # Build OpenAI-format messages
        oai_messages: list[dict] = [{"role": "system", "content": system_prompt}]
        for m in messages:
            oai_messages.append(self._convert_to_oai_message(m))

        for round_idx in range(self._config.max_tool_rounds):
            api_kwargs: dict[str, Any] = {
                "model": self._config.model,
                "max_tokens": self._config.max_tokens,
                "messages": oai_messages,
                "temperature": self._config.temperature,
            }
            if tool_defs:
                api_kwargs["tools"] = tool_defs
                api_kwargs["tool_choice"] = "auto"

            response = await client.chat.completions.create(**api_kwargs)
            choice = response.choices[0]
            usage_total = response.usage

            if choice.finish_reason == "stop" or not choice.message.tool_calls:
                return choice.message.content or "...", tool_calls, usage_total

            # Execute function calls
            oai_messages.append(choice.message.model_dump())
            for tc in choice.message.tool_calls:
                tool_start = time.monotonic()
                try:
                    args = json.loads(tc.function.arguments)
                except json.JSONDecodeError:
                    args = {}
                result_data = await self._call_tool(tc.function.name, args, user_id)
                duration_ms = int((time.monotonic() - tool_start) * 1000)
                tool_calls.append(ToolCallRecord(
                    tool_name=tc.function.name, args=args,
                    result_summary=result_data["result"][:300],
                    duration_ms=duration_ms, success=result_data["success"],
                    error_message=result_data.get("error"),
                ))
                oai_messages.append({
                    "role": "tool",
                    "tool_call_id": tc.id,
                    "content": result_data["result"],
                })

        return "请求涉及的操作较多，请简化问题。", tool_calls, usage_total

    async def _call_tool(self, name: str, args: dict, user_id: str | None) -> dict:
        try:
            result = await self._tools.execute(name, args, user_id)
            return {"success": True, "result": _summarize_result(result)}
        except Exception as e:
            return {"success": False, "result": f"执行失败: {e}", "error": str(e)}

    @staticmethod
    def _convert_to_oai_message(msg: dict) -> dict:
        role = msg.get("role", "user")
        content = msg.get("content", "")

        if isinstance(content, list):
            # Anthropic block format → extract text
            texts = [b.get("text", "") for b in content if isinstance(b, dict) and b.get("type") == "text"]
            return {"role": role, "content": "\n".join(texts)}
        return {"role": role, "content": str(content)}
