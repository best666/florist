"""MySQL connection pool manager for read-only access to the main app database."""

from __future__ import annotations

import logging
from typing import Any

import aiomysql

from app.config import settings

logger = logging.getLogger(__name__)


class MySQLManager:
    """Async MySQL connection pool for read-only queries against the main app database."""

    def __init__(self) -> None:
        self._pool: aiomysql.Pool | None = None

    async def initialize(self) -> None:
        if self._pool is not None:
            return

        try:
            self._pool = await aiomysql.create_pool(
                host=settings.mysql_host,
                port=settings.mysql_port,
                user=settings.mysql_user,
                password=settings.mysql_password,
                db=settings.mysql_database,
                minsize=2,
                maxsize=10,
                autocommit=True,
                charset="utf8mb4",
            )
            logger.info("MySQL connection pool initialized")
        except Exception as e:
            logger.warning("MySQL connection failed (will retry on demand): %s", e)
            self._pool = None

    @property
    def pool(self) -> aiomysql.Pool:
        if self._pool is None:
            raise RuntimeError("MySQL pool not initialized. Call initialize() first.")
        return self._pool

    @property
    def is_available(self) -> bool:
        return self._pool is not None

    async def close(self) -> None:
        if self._pool:
            self._pool.close()
            await self._pool.wait_closed()
            self._pool = None
            logger.info("MySQL connection pool closed")

    async def fetch_all(self, query: str, params: tuple | None = None) -> list[dict[str, Any]]:
        async with self.pool.acquire() as conn:
            async with conn.cursor(aiomysql.DictCursor) as cursor:
                await cursor.execute(query, params or ())
                return await cursor.fetchall()  # type: ignore[return-value]

    async def fetch_one(self, query: str, params: tuple | None = None) -> dict[str, Any] | None:
        rows = await self.fetch_all(query, params)
        return rows[0] if rows else None


# Singleton
mysql_manager = MySQLManager()
