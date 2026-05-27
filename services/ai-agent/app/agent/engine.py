"""AgentEngine: main orchestrator for the Florist AI agent.

Coordinates system prompt assembly, memory retrieval, model routing,
tool execution, cost tracking, audit logging, and response generation.
"""

from __future__ import annotations

import logging
import time
import uuid
from datetime import datetime

import anthropic

from app.agent.compressor import ContextCompressor
from app.agent.runner import AgentRunner
from app.agent.skill_router import SkillRouter
from app.agent.system_prompt import build_system_prompt
from app.agent.types import AgentConfig, AgentContext, AgentResponse
from app.config import settings
from app.memory.db import MemoryDatabase
from app.services.cost_tracker import CostTracker
from app.tools.registry import tool_registry

logger = logging.getLogger(__name__)

# Ensure all tools are imported and registered
import app.tools.weather  # noqa: F401
import app.tools.plants  # noqa: F401
import app.tools.care_records  # noqa: F401
import app.tools.diagnosis  # noqa: F401
import app.tools.advice  # noqa: F401
import app.tools.user  # noqa: F401
import app.tools.knowledge  # noqa: F401


class AgentEngine:
    """Main agent engine that orchestrates all components."""

    def __init__(self, memory_db: MemoryDatabase) -> None:
        self._client = anthropic.AsyncAnthropic(api_key=settings.anthropic_api_key)
        self._memory = memory_db
        self._runner = AgentRunner(self._client, tool_registry)
        self._compressor = ContextCompressor(self._client, memory_db)
        self._skill_router = SkillRouter()
        self._cost_tracker = CostTracker(memory_db)

    async def chat(self, ctx: AgentContext) -> AgentResponse:
        """Process a user message through the agent pipeline."""
        start_time = time.monotonic()
        ctx.conversation_id = ctx.conversation_id or f"conv_{uuid.uuid4().hex[:16]}"

        # 1. Load user memories
        ctx.user_memories = await self._load_user_memories(ctx.user_id)
        ctx.episodic_memories = await self._load_episodic_memories(ctx.user_id)
        ctx.plant_count = await self._get_plant_count(ctx.user_id)

        # 2. Detect skill if not explicitly set
        if not ctx.skill:
            ctx.skill = self._skill_router.detect(ctx.message, ctx.attachments)

        skill_config = self._skill_router.get_skill_config(ctx.skill) or {}
        active_tools = self._skill_router.get_required_tools(ctx.skill)

        # 3. Check for compression
        compression_triggered = False
        episodic_summary = None
        if ctx.conversation_id:
            needs_compression = await self._compressor.needs_compression(ctx.conversation_id)
            if needs_compression:
                episodic_summary = await self._compressor.compress(ctx.conversation_id, ctx.user_id)
                compression_triggered = True

        # 4. Build system prompt
        system_prompt = build_system_prompt(
            user_memories=ctx.user_memories,
            skill=ctx.skill,
            plant_count=ctx.plant_count,
            episodic_summary=episodic_summary or "\n".join(ctx.episodic_memories) if ctx.episodic_memories else None,
        )

        # 5. Load conversation history
        history_messages = await self._load_conversation_messages(ctx.conversation_id) if ctx.conversation_id else []

        # 6. Build messages array for Claude
        messages: list[dict] = []
        messages.extend(history_messages)
        messages.append({"role": "user", "content": ctx.message})

        # 7. Configure agent based on skill
        model_tier = skill_config.get("model_tier", "standard")
        agent_config = self._build_config(model_tier, bool(ctx.attachments))
        self._runner.configure(agent_config)

        # 8. Save user message
        await self._save_message(ctx.conversation_id, "user", ctx.message)

        # 9. Run agent loop
        try:
            reply, tool_calls, usage = await self._runner.run(
                system_prompt=system_prompt,
                messages=messages,
                active_tools=active_tools if active_tools else None,
                user_id=ctx.user_id,
            )
        except Exception as e:
            logger.error("Agent run failed: %s", e)
            reply = "抱歉，我暂时遇到了一些问题，请稍后再试。如果问题持续，请联系我们。"
            tool_calls = []
            usage = None

        # 10. Save assistant response
        await self._save_message(ctx.conversation_id, "assistant", reply)

        # 11. Consolidate memories
        await self._consolidate_memories(ctx, reply)

        # 12. Track cost
        cost = 0.0
        if usage:
            cost = await self._cost_tracker.track_call(
                user_id=ctx.user_id,
                model=agent_config.model,
                usage=usage,
            )

        # 13. Write audit log
        await self._write_audit(ctx, reply, tool_calls, usage, cost, start_time)

        duration_ms = int((time.monotonic() - start_time) * 1000)
        logger.info("Chat completed in %dms, cost=$%.4f, %d tool calls", duration_ms, cost, len(tool_calls))

        return AgentResponse(
            conversation_id=ctx.conversation_id,
            reply=reply,
            tool_calls=tool_calls,
            tokens_input=usage.input_tokens if usage else 0,
            tokens_output=usage.output_tokens if usage else 0,
            tokens_cached=getattr(usage, "cache_read_input_tokens", 0) if usage else 0,
            model=agent_config.model,
            cost_estimate=cost,
            skill_used=ctx.skill,
            compression_triggered=compression_triggered,
        )

    async def _load_user_memories(self, user_id: str) -> dict[str, str]:
        try:
            rows = await self._memory.fetch_all(
                "SELECT key, value FROM user_memory WHERE user_id = ?", (user_id,)
            )
            return {row["key"]: row["value"] for row in rows}
        except Exception:
            return {}

    async def _load_episodic_memories(self, user_id: str) -> list[str]:
        try:
            rows = await self._memory.fetch_all(
                "SELECT summary FROM episodic_memory WHERE user_id = ? ORDER BY importance DESC LIMIT 5",
                (user_id,),
            )
            return [row["summary"] for row in rows]
        except Exception:
            return []

    async def _get_plant_count(self, user_id: str) -> int:
        try:
            from app.db import mysql_manager
            if not mysql_manager.is_available:
                return 0
            from app.db.queries import get_user_flowers
            plants = await get_user_flowers(user_id)
            return len(plants)
        except Exception:
            return 0

    async def _load_conversation_messages(self, conversation_id: str) -> list[dict]:
        try:
            rows = await self._memory.fetch_all(
                """SELECT role, content FROM messages
                   WHERE conversation_id = ? AND compressed = 0
                   ORDER BY created_at ASC LIMIT 40""",
                (conversation_id,),
            )
            return [{"role": row["role"], "content": row["content"]} for row in rows]
        except Exception:
            return []

    async def _save_message(self, conversation_id: str, role: str, content: str) -> None:
        try:
            await self._memory.execute(
                "INSERT INTO messages (conversation_id, role, content) VALUES (?, ?, ?)",
                (conversation_id, role, content),
            )
            await self._memory.execute(
                """INSERT INTO conversations (id, user_id, updated_at)
                   VALUES (?, '', datetime('now'))
                   ON CONFLICT(id) DO UPDATE SET updated_at = datetime('now'), message_count = message_count + 1""",
                (conversation_id,),
            )
            await self._memory.commit()
        except Exception as e:
            logger.warning("Failed to save message: %s", e)

    async def _consolidate_memories(self, ctx: AgentContext, reply: str) -> None:
        """Check if new memories should be created from this conversation turn."""
        try:
            from app.memory.importance import MemoryImportance
            importance_scorer = MemoryImportance(self._client)

            combined = f"用户说: {ctx.message}\n回复: {reply[:500]}"
            score = await importance_scorer.score_quick(combined)

            if score > 0.5:
                from app.memory.consolidation import consolidate_turn
                await consolidate_turn(self._memory, ctx, reply, score)
        except Exception as e:
            logger.debug("Memory consolidation skipped: %s", e)

    async def _write_audit(
        self,
        ctx: AgentContext,
        reply: str,
        tool_calls: list,
        usage: anthropic.types.Usage | None,
        cost: float,
        start_time: float,
    ) -> None:
        try:
            if not settings.audit_log_enabled:
                return
            import json
            event_id = f"evt_{uuid.uuid4().hex[:16]}"
            duration_ms = int((time.monotonic() - start_time) * 1000)
            tool_calls_json = json.dumps([tc.model_dump() for tc in tool_calls], ensure_ascii=False) if tool_calls else None

            await self._memory.execute(
                """INSERT INTO audit_events
                   (id, timestamp, event_type, user_id, session_id, conversation_id,
                    action, resource, status, duration_ms, model,
                    tokens_input, tokens_output, tokens_cached, cost_estimate, tool_calls)
                   VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
                (
                    event_id,
                    datetime.now().isoformat(),
                    "chat",
                    ctx.user_id,
                    ctx.session_id,
                    ctx.conversation_id,
                    "chat",
                    "conversation",
                    "success",
                    duration_ms,
                    usage.model if usage and hasattr(usage, 'model') else settings.anthropic_default_model,
                    usage.input_tokens if usage else 0,
                    usage.output_tokens if usage else 0,
                    getattr(usage, 'cache_read_input_tokens', 0) if usage else 0,
                    round(cost, 6),
                    tool_calls_json,
                ),
            )
            await self._memory.commit()
        except Exception as e:
            logger.debug("Audit log write skipped: %s", e)

    @staticmethod
    def _build_config(model_tier: str, has_image: bool) -> AgentConfig:
        if has_image or model_tier == "complex":
            return AgentConfig(
                model=settings.anthropic_default_model,
                max_tokens=4096,
                enable_thinking=True,
                thinking_budget_tokens=2048,
            )
        if model_tier == "simple":
            return AgentConfig(
                model=settings.anthropic_simple_model,
                max_tokens=1024,
            )
        return AgentConfig(
            model=settings.anthropic_default_model,
            max_tokens=2048,
        )
