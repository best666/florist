"""SQL query functions for read-only access to the main app MySQL database."""

from __future__ import annotations

from app.db import mysql_manager


async def get_user(user_id: str) -> dict | None:
    return await mysql_manager.fetch_one(
        "SELECT id, nickname, avatarUrl, profileSignature, loginType, status, lastLoginAt FROM User WHERE id = %s",
        (user_id,),
    )


async def get_user_flowers(user_id: str) -> list[dict]:
    return await mysql_manager.fetch_all(
        """
        SELECT f.*, fi.url AS coverImageUrl, fi.compressedUrl AS coverImageCompressedUrl
        FROM Flower f
        LEFT JOIN FlowerImage fi ON fi.id = f.coverImageId
        WHERE f.userId = %s AND f.isDeleted = FALSE
        ORDER BY f.updatedAt DESC
        """,
        (user_id,),
    )


async def get_flower_detail(flower_id: str) -> dict | None:
    return await mysql_manager.fetch_one(
        """
        SELECT f.*, fi.url AS coverImageUrl, fi.compressedUrl AS coverImageCompressedUrl
        FROM Flower f
        LEFT JOIN FlowerImage fi ON fi.id = f.coverImageId
        WHERE f.id = %s
        """,
        (flower_id,),
    )


async def get_flower_images(flower_id: str) -> list[dict]:
    return await mysql_manager.fetch_all(
        "SELECT id, url, compressedUrl, createdAt FROM FlowerImage WHERE flowerId = %s ORDER BY createdAt DESC",
        (flower_id,),
    )


async def get_care_records_for_flower(flower_id: str, limit: int = 20) -> list[dict]:
    return await mysql_manager.fetch_all(
        """
        SELECT cr.*, cri.url AS imageUrl
        FROM CareRecord cr
        LEFT JOIN CareRecordImage cri ON cri.recordId = cr.id
        WHERE cr.flowerId = %s
        ORDER BY cr.createdAt DESC
        LIMIT %s
        """,
        (flower_id, limit),
    )


async def get_care_records_for_user(user_id: str, limit: int = 30) -> list[dict]:
    return await mysql_manager.fetch_all(
        """
        SELECT cr.*, f.name AS flowerName
        FROM CareRecord cr
        JOIN Flower f ON f.id = cr.flowerId
        WHERE cr.userId = %s
        ORDER BY cr.createdAt DESC
        LIMIT %s
        """,
        (user_id, limit),
    )


async def get_user_member(user_id: str) -> dict | None:
    return await mysql_manager.fetch_one(
        """
        SELECT * FROM Member
        WHERE userId = %s AND status = 'active'
        ORDER BY createdAt DESC LIMIT 1
        """,
        (user_id,),
    )
