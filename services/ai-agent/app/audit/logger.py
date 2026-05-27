"""Structured audit event logger."""

from __future__ import annotations

import json
import logging
import uuid
from datetime import datetime

from app.audit.models import AuditEvent, AuditEventType

logger = logging.getLogger("audit")


async def log_event(
    db,  # MemoryDatabase, passed to avoid circular import
    event_type: AuditEventType,
    user_id: str | None,
    session_id: str,
    action: str,
    resource: str,
    status: str = "success",
    **kwargs,
) -> str:
    """Write a structured audit event to the database."""
    event_id = f"evt_{uuid.uuid4().hex[:16]}"

    try:
        tool_calls_json = json.dumps(kwargs.get("tool_calls", []), ensure_ascii=False, default=str)
        security_flags_json = json.dumps(kwargs.get("security_flags", []), ensure_ascii=False)

        await db.execute(
            """INSERT INTO audit_events
               (id, timestamp, event_type, user_id, session_id, conversation_id,
                action, resource, status, duration_ms, model,
                tokens_input, tokens_output, tokens_cached, cost_estimate,
                tool_calls, security_flags, metadata)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
            (
                event_id,
                datetime.now().isoformat(),
                event_type.value,
                user_id,
                session_id,
                kwargs.get("conversation_id"),
                action,
                resource,
                status,
                kwargs.get("duration_ms", 0),
                kwargs.get("model", ""),
                kwargs.get("tokens_input", 0),
                kwargs.get("tokens_output", 0),
                kwargs.get("tokens_cached", 0),
                round(kwargs.get("cost_estimate", 0.0), 6),
                tool_calls_json if kwargs.get("tool_calls") else None,
                security_flags_json if kwargs.get("security_flags") else None,
                json.dumps(kwargs.get("metadata", {}), ensure_ascii=False, default=str),
            ),
        )
        await db.commit()
    except Exception as e:
        logger.debug("Audit event write failed: %s", e)

    return event_id
