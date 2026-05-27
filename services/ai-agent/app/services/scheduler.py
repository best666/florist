"""APScheduler-based task scheduler for periodic tasks like daily advice generation."""

from __future__ import annotations

import logging

from apscheduler.schedulers.asyncio import AsyncIOScheduler

logger = logging.getLogger(__name__)

scheduler = AsyncIOScheduler()


def init_scheduler() -> None:
    """Initialize and start the background scheduler."""
    # Daily advice batch generation at 6:00 AM
    # scheduler.add_job(
    #     batch_generate_daily_advice,
    #     trigger="cron",
    #     hour=6,
    #     minute=0,
    #     id="daily_advice_batch",
    #     replace_existing=True,
    # )

    scheduler.start()
    logger.info("Background scheduler started")
