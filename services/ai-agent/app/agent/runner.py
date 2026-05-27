"""AgentRunner: executes the Claude API message loop with tool use support."""

from __future__ import annotations

import json
import logging
import time
from typing import Any

import anthropic

from app.agent.types import AgentConfig, ToolCallRecord
from app.tools.registry import ToolRegistry

logger = logging.getLogger(__name__)

MAX_TOOL_RESULT_CHARS = 4000


def _summarize_result(result: Any, max_chars: int = MAX_TOOL_RESULT_CHARS) -> str:
    """Convert tool result to string, truncating if too long."""
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
    """Handles the Claude API message + tool_use loop."""

    def __init__(self, client: anthropic.AsyncAnthropic, tool_registry: ToolRegistry) -> None:
        self._client = client
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
    ) -> tuple[str, list[ToolCallRecord], anthropic.types.Usage | None]:
        """Execute the agent loop: API call → tool_use → API call → ... → final text.

        Returns:
            Tuple of (final_text_response, list_of_tool_call_records, usage_info).
        """
        tool_defs = self._tools.get_anthropic_tools(active_tools) if active_tools else None
        tool_calls: list[ToolCallRecord] = []
        usage_total: anthropic.types.Usage | None = None

        for round_idx in range(self._config.max_tool_rounds):
            logger.info("Agent round %d/%d", round_idx + 1, self._config.max_tool_rounds)

            api_kwargs: dict[str, Any] = {
                "model": self._config.model,
                "max_tokens": self._config.max_tokens,
                "system": system_prompt,
                "messages": messages,
                "temperature": self._config.temperature,
            }

            if tool_defs:
                api_kwargs["tools"] = tool_defs

            response = await self._client.messages.create(**api_kwargs)  # type: ignore[arg-type]

            if response.usage:
                usage_total = response.usage

            # Append assistant response to message history
            messages.append({
                "role": "assistant",
                "content": [b.model_dump() if hasattr(b, "model_dump") else b for b in response.content],
            })

            if response.stop_reason == "end_turn":
                text_blocks = [b for b in response.content if b.type == "text"]
                final_text = "\n".join(b.text for b in text_blocks)
                logger.info("Agent finished with %d tool calls in %d rounds", len(tool_calls), round_idx + 1)
                return final_text, tool_calls, usage_total

            if response.stop_reason == "tool_use":
                tool_results: list[dict] = []
                for block in response.content:
                    if block.type != "tool_use":
                        continue

                    tool_start = time.monotonic()
                    tool_name = block.name
                    tool_args = block.input if isinstance(block.input, dict) else {}

                    logger.info("Executing tool: %s(%s)", tool_name, json.dumps(tool_args, ensure_ascii=False)[:200])

                    try:
                        result = await self._tools.execute(tool_name, tool_args, user_id)
                        success = True
                        error_msg = None
                        result_text = _summarize_result(result)
                    except Exception as e:
                        success = False
                        error_msg = str(e)
                        result_text = f"工具执行失败: {error_msg}"
                        logger.error("Tool %s failed: %s", tool_name, e)

                    duration_ms = int((time.monotonic() - tool_start) * 1000)

                    tool_calls.append(ToolCallRecord(
                        tool_name=tool_name,
                        args=tool_args,
                        result_summary=result_text[:300] + ("..." if len(result_text) > 300 else ""),
                        duration_ms=duration_ms,
                        success=success,
                        error_message=error_msg,
                    ))

                    tool_results.append({
                        "type": "tool_result",
                        "tool_use_id": block.id,
                        "content": result_text,
                    })

                # Append tool results as user message
                messages.append({"role": "user", "content": tool_results})
                continue

            # stop_reason other than end_turn or tool_use
            text_blocks = [b for b in response.content if b.type == "text"]
            final_text = "\n".join(b.text for b in text_blocks) if text_blocks else "抱歉，我暂时无法处理这个请求，请稍后再试。"
            return final_text, tool_calls, usage_total

        # Max rounds exceeded
        logger.warning("Agent reached max tool rounds (%d)", self._config.max_tool_rounds)
        return "抱歉，这个请求涉及的操作较多，我暂时处理不完。能否简化一下你的问题，或者分步骤来问我？", tool_calls, usage_total
