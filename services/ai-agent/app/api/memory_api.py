"""User memory management endpoints."""

from __future__ import annotations

from fastapi import APIRouter, Depends, Request

from app.api.deps import verify_api_key
from app.api.schemas import MemoryResponse, MemoryUpdateRequest

router = APIRouter(prefix="/memory", tags=["memory"])


@router.get("/{user_id}", response_model=MemoryResponse)
async def get_user_memory(
    request: Request,
    user_id: str,
    api_key: str = Depends(verify_api_key),
):
    """Get all stored memories for a user."""
    db = request.app.state.memory_db
    rows = await db.fetch_all(
        "SELECT key, value FROM user_memory WHERE user_id = ? ORDER BY importance DESC",
        (user_id,),
    )
    return MemoryResponse(
        user_id=user_id,
        memories={row["key"]: row["value"] for row in rows},
        count=len(rows),
    )


@router.put("/{user_id}")
async def update_user_memory(
    request: Request,
    user_id: str,
    payload: MemoryUpdateRequest,
    api_key: str = Depends(verify_api_key),
):
    """Update a single memory entry."""
    db = request.app.state.memory_db
    await db.execute(
        """INSERT INTO user_memory (user_id, key, value, updated_at)
           VALUES (?, ?, ?, datetime('now'))
           ON CONFLICT(user_id, key) DO UPDATE SET value = ?, updated_at = datetime('now')""",
        (user_id, payload.key, payload.value, payload.value),
    )
    await db.commit()
    return {"saved": True, "user_id": user_id, "key": payload.key}


@router.delete("/{user_id}/{key}")
async def delete_user_memory(
    request: Request,
    user_id: str,
    key: str,
    api_key: str = Depends(verify_api_key),
):
    """Delete a specific memory entry."""
    db = request.app.state.memory_db
    await db.execute(
        "DELETE FROM user_memory WHERE user_id = ? AND key = ?",
        (user_id, key),
    )
    await db.commit()
    return {"deleted": True, "user_id": user_id, "key": key}
