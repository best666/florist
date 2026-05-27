"""Multi-level rate limiting."""

from __future__ import annotations

import time
from collections import defaultdict
from typing import Any

from app.config import settings


class RateLimiter:
    """In-memory rate limiter with user-level, IP-level, and global limits."""

    def __init__(self) -> None:
        self._user_buckets: dict[str, list[float]] = defaultdict(list)
        self._ip_buckets: dict[str, list[float]] = defaultdict(list)
        self._global_requests: list[float] = []

    def check(self, user_id: str | None = None, ip: str | None = None) -> bool:
        """Check if the request is within rate limits. Returns True if allowed."""
        now = time.monotonic()

        # Global limit
        self._global_requests = [t for t in self._global_requests if now - t < 1.0]
        if len(self._global_requests) >= settings.rate_limit_global_per_second:
            return False
        self._global_requests.append(now)

        # User limit
        if user_id:
            bucket = self._user_buckets[user_id]
            bucket = [t for t in bucket if now - t < 60.0]
            self._user_buckets[user_id] = bucket
            if len(bucket) >= settings.rate_limit_user_per_minute:
                return False
            bucket.append(now)

        # IP limit
        if ip:
            bucket = self._ip_buckets[ip]
            bucket = [t for t in bucket if now - t < 60.0]
            self._ip_buckets[ip] = bucket
            if len(bucket) >= settings.rate_limit_ip_per_minute:
                return False
            bucket.append(now)

        return True
