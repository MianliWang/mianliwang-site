from __future__ import annotations

from typing import Annotated

from fastapi import FastAPI, File, Form, Request, UploadFile
from fastapi.responses import JSONResponse, Response

from app.babeldoc_adapter import BabelDocError, translate_pdf
from app.rate_limit import check_rate_limit
from app.schemas import ErrorResponse, HealthResponse, OutputMode
from app.security import get_client_identifier
from app.settings import settings

app = FastAPI(
    title="PDF Translate Service",
    description=(
        "Independent FastAPI service for PDF translation using BabelDOC with "
        "layout-preserving output."
    ),
    version="0.1.0",
)


def _error(status_code: int, error: str, detail: str | None = None) -> JSONResponse:
    payload = ErrorResponse(error=error, detail=detail).model_dump()
    return JSONResponse(status_code=status_code, content=payload)


@app.get("/health", response_model=HealthResponse, tags=["system"])
def health() -> HealthResponse:
    return HealthResponse()


@app.post(
    "/translate/pdf",
    tags=["translate"],
    responses={
        200: {
            "description": "Translated PDF bytes",
            "content": {"application/pdf": {}},
        },
        400: {"model": ErrorResponse},
        413: {"model": ErrorResponse},
        415: {"model": ErrorResponse},
        422: {"model": ErrorResponse},
        429: {"model": ErrorResponse},
        500: {"model": ErrorResponse},
    },
)
async def translate_pdf_route(
    request: Request,
    file: Annotated[UploadFile, File(description="Source PDF file")],
    source_lang: Annotated[str, Form(description="Source language token")] = "auto",
    target_lang: Annotated[str, Form(description="Target language token")] = "en",
    output_mode: Annotated[
        OutputMode,
        Form(description="translated: translated-only PDF; bilingual: dual-language PDF"),
    ] = OutputMode.bilingual,
) -> Response:
    client_id = get_client_identifier(request)
    limit = check_rate_limit(client_id)
    if not limit.allowed:
        return _error(
            status_code=429,
            error="RATE_LIMITED",
            detail=f"Retry after {limit.retry_after_seconds} seconds.",
        )

    filename = file.filename or "document.pdf"
    if not filename.lower().endswith(".pdf"):
        return _error(status_code=415, error="UNSUPPORTED_FILE_TYPE")

    source_lang = source_lang.strip().lower()
    target_lang = target_lang.strip().lower()

    if (
        not source_lang
        or not target_lang
        or len(source_lang) > settings.translate_language_token_max_length
        or len(target_lang) > settings.translate_language_token_max_length
    ):
        return _error(status_code=400, error="INVALID_LANGUAGE_TOKEN")

    if source_lang == target_lang and source_lang != "auto":
        return _error(
            status_code=400,
            error="INVALID_LANGUAGE_PAIR",
            detail="source_lang and target_lang must differ unless source_lang=auto.",
        )

    source_pdf_bytes = await file.read()
    if not source_pdf_bytes:
        return _error(status_code=400, error="EMPTY_FILE")

    if len(source_pdf_bytes) > settings.translate_pdf_max_bytes:
        return _error(
            status_code=413,
            error="FILE_TOO_LARGE",
            detail=f"Max allowed bytes: {settings.translate_pdf_max_bytes}.",
        )

    if not source_pdf_bytes.startswith(b"%PDF"):
        return _error(status_code=415, error="UNSUPPORTED_FILE_TYPE")

    try:
        result = translate_pdf(
            source_pdf_bytes=source_pdf_bytes,
            source_filename=filename,
            source_lang=source_lang,
            target_lang=target_lang,
            output_mode=output_mode,
        )
    except BabelDocError as error:
        return _error(status_code=500, error="TRANSLATION_FAILED", detail=str(error))
    except Exception:
        return _error(status_code=500, error="INTERNAL_ERROR")

    return Response(
        content=result.file_bytes,
        media_type="application/pdf",
        headers={
            "Content-Disposition": f'attachment; filename="{result.output_filename}"'
        },
    )
