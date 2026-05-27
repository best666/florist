"""FastAPI middleware for audit logging, rate limiting, and security."""

from __future__ import annotations

import logging
import time
import uuid

from fastapi import Request
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import JSONResponse

from app.analytics.collector import chat_requests_total
from app.security.prompt_defense import detect_injection
from app.security.rate_limiter import RateLimiter
from app.security.sanitizer import sanitize_user_input

logger = logging.getLogger(__name__)
rate_limiter = RateLimiter()


class SecurityMiddleware(BaseHTTPMiddleware):
    """Applies security checks, rate limiting, and request tracking."""

    async def dispatch(self, request: Request, call_next):
        request_id = str(uuid.uuid4())
        request.state.request_id = request_id
        request.state.start_time = time.monotonic()

        # Rate limiting
        client_ip = request.client.host if request.client else "unknown"
        user_id = None

        if request.method == "POST":
            try:
                body = await request.json()
                user_id = body.get("user_id")
            except Exception:
                pass

        if not rate_limiter.check(user_id=user_id, ip=client_ip):
            chat_requests_total.labels(status="rate_limited", skill="none").inc()
            return JSONResponse(
                status_code=429,
                content={"error": "请求过于频繁，请稍后再试", "detail": "Rate limit exceeded"},
            )

        # Prompt injection check for chat endpoints
        if request.url.path in ("/chat", "/chat/stream") and request.method == "POST":
            try:
                body = await request.json()
                message = body.get("message", "")
                sanitized = sanitize_user_input(message)

                risk = detect_injection(sanitized)
                if risk.action == "block":
                    chat_requests_total.labels(status="blocked", skill="none").inc()
                    return JSONResponse(
                        status_code=400,
                        content={"error": "请求内容不安全，已被拦截", "detail": f"Risk score: {risk.score}"},
                    )
            except Exception:
                pass

            # Reconstruct request with sanitized body for downstream
            async def receive():
                import json
                body["message"] = sanitize_user_input(body.get("message", ""))
                return {"type": "http.request", "body": json.dumps(body).encode()}

            request._receive = receive

        response = await call_next(request)

        # Add request ID header
        response.headers["X-Request-ID"] = request_id
        return response
