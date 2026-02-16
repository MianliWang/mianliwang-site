from __future__ import annotations

from hashlib import sha256
from ipaddress import ip_address

from fastapi import Request

TRUSTED_IP_HEADERS = (
    "x-vercel-forwarded-for",
    "cf-connecting-ip",
    "x-real-ip",
)


def _normalize_ip_token(value: str) -> str | None:
    token = value.strip()
    if not token:
        return None

    bracketed = token
    if token.startswith("[") and "]" in token:
        bracketed = token[1 : token.index("]")]

    if ":" in token and token.count(".") == 3:
        # ipv4:port
        token = token.split(":", maxsplit=1)[0]

    candidate = bracketed if bracketed != token else token
    try:
        ip_address(candidate)
        return candidate
    except ValueError:
        return None


def _parse_forwarded_header(value: str) -> str | None:
    candidates = [part.strip() for part in value.split(",") if part.strip()]
    for candidate in reversed(candidates):
        parsed = _normalize_ip_token(candidate)
        if parsed:
            return parsed
    return None


def _build_fallback_identifier(request: Request) -> str:
    fingerprint = "|".join(
        (
            request.headers.get("user-agent", ""),
            request.headers.get("accept-language", ""),
            request.headers.get("sec-ch-ua-platform", ""),
            request.headers.get("host", ""),
        )
    )
    digest = sha256(fingerprint.encode("utf-8")).hexdigest()[:20]
    return f"fp:{digest}"


def get_client_identifier(request: Request) -> str:
    for header in TRUSTED_IP_HEADERS:
        value = request.headers.get(header)
        if not value:
            continue

        parsed = _parse_forwarded_header(value)
        if parsed:
            return f"ip:{parsed}"

    forwarded = request.headers.get("x-forwarded-for")
    if forwarded:
        parsed = _parse_forwarded_header(forwarded)
        if parsed:
            return f"ip:{parsed}"

    return _build_fallback_identifier(request)
