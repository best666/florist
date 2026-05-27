"""FastAPI application entry point with lifespan management."""

from __future__ import annotations

import logging
from contextlib import asynccontextmanager
from typing import AsyncGenerator

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.memory.db import MemoryDatabase

logging.basicConfig(
    level=getattr(logging, settings.log_level),
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    logger.info("Starting Florist AI Agent service...")

    # Initialize SQLite memory database
    memory_db = MemoryDatabase(settings.sqlite_path)
    await memory_db.initialize()
    app.state.memory_db = memory_db

    # MySQL pool is initialized lazily on first use

    # Vector store is initialized lazily on first use

    logger.info("Florist AI Agent service started successfully")
    yield

    # Shutdown
    logger.info("Shutting down Florist AI Agent service...")
    await memory_db.close()
    logger.info("Shutdown complete")


def create_app() -> FastAPI:
    app = FastAPI(
        title="Florist AI Agent",
        description="智能养花 AI 助手 — 提供对话式植物养护建议、病虫害诊断、每日养护提醒",
        version="0.1.0",
        lifespan=lifespan,
    )

    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    from app.api.router import api_router
    app.include_router(api_router)

    return app


app = create_app()
