from __future__ import annotations

from enum import Enum

from pydantic import BaseModel, Field


class OutputMode(str, Enum):
    translated = "translated"
    bilingual = "bilingual"


class HealthResponse(BaseModel):
    ok: bool = True
    service: str = "pdf-translate-api"


class ErrorResponse(BaseModel):
    ok: bool = False
    error: str = Field(..., examples=["RATE_LIMITED"])
    detail: str | None = None
