from __future__ import annotations

from pathlib import Path
from typing import Literal

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    # LLM Backend: 'anthropic' or 'openai'
    llm_backend: Literal["anthropic", "openai"] = "openai"

    # Anthropic (used when llm_backend='anthropic')
    anthropic_api_key: str = ""
    anthropic_default_model: str = "claude-sonnet-4-20250514"
    anthropic_simple_model: str = "claude-haiku-3-5-20241022"

    # OpenAI-compatible (used when llm_backend='openai', e.g. DeepSeek)
    openai_api_key: str = ""
    openai_base_url: str = "https://api.deepseek.com/v1"

    # MySQL
    mysql_host: str = "127.0.0.1"
    mysql_port: int = 3307
    mysql_user: str = "florist"
    mysql_password: str = "florist123"
    mysql_database: str = "florist"

    # SQLite
    sqlite_path: str = "./data/florist_agent.db"

    # ChromaDB
    chroma_host: str = "127.0.0.1"
    chroma_port: int = 8001
    chroma_persist_dir: str = "./data/chroma"

    # Server
    server_host: str = "0.0.0.0"
    server_port: int = 8000
    api_key: str = "florist-agent-api-key-change-me"
    admin_key: str = "florist-admin-key-change-me"

    # Rate Limiting
    rate_limit_user_per_minute: int = 60
    rate_limit_ip_per_minute: int = 120
    rate_limit_global_per_second: int = 50

    # Cost Management
    daily_budget_per_user_usd: float = 0.50
    monthly_budget_total_usd: float = 100.00

    # Logging
    log_level: Literal["DEBUG", "INFO", "WARNING", "ERROR"] = "INFO"
    audit_log_enabled: bool = True

    # OpenTelemetry
    otel_exporter_otlp_endpoint: str = "http://127.0.0.1:4317"
    otel_enabled: bool = False


settings = Settings()

# Ensure data directory exists
Path(settings.sqlite_path).parent.mkdir(parents=True, exist_ok=True)
