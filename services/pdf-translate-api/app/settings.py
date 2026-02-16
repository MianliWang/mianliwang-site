from __future__ import annotations

from pathlib import Path

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    app_name: str = "PDF Translate Service"
    app_env: str = "development"
    app_host: str = "0.0.0.0"
    app_port: int = 8080

    # BabelDOC process settings
    babeldoc_bin: str = "babeldoc"
    babeldoc_timeout_seconds: int = 900
    babeldoc_extra_args: str = ""
    babeldoc_work_root: Path = Field(
        default_factory=lambda: Path(".tmp") / "babeldoc-jobs"
    )

    # Upload/input guardrails
    translate_pdf_max_bytes: int = 25 * 1024 * 1024
    translate_text_max_chars: int = 2400
    translate_language_token_max_length: int = 16

    # Minimal in-memory rate-limit
    translate_rate_limit_window_seconds: int = 600
    translate_rate_limit_max_requests: int = 4

    # Optional OpenAI env pass-through for BabelDOC
    openai_api_key: str = ""
    openai_base_url: str = ""
    openai_model: str = ""

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        env_prefix="",
        extra="ignore",
    )


settings = Settings()
