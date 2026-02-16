from __future__ import annotations

from dataclasses import dataclass
from time import time

from app.settings import settings


@dataclass(slots=True)
class RateLimitResult:
    allowed: bool
    retry_after_seconds: int
    limit: int


@dataclass(slots=True)
class Bucket:
    count: int
    reset_at: float


_buckets: dict[str, Bucket] = {}


def _cleanup(now: float) -> None:
    expired = [key for key, bucket in _buckets.items() if bucket.reset_at <= now]
    for key in expired:
        _buckets.pop(key, None)


def check_rate_limit(identifier: str) -> RateLimitResult:
    now = time()
    _cleanup(now)

    window = settings.translate_rate_limit_window_seconds
    limit = settings.translate_rate_limit_max_requests

    current = _buckets.get(identifier)
    if current is None or current.reset_at <= now:
        _buckets[identifier] = Bucket(count=1, reset_at=now + window)
        return RateLimitResult(allowed=True, retry_after_seconds=0, limit=limit)

    if current.count >= limit:
        retry_after = max(1, int(current.reset_at - now))
        return RateLimitResult(
            allowed=False,
            retry_after_seconds=retry_after,
            limit=limit,
        )

    current.count += 1
    _buckets[identifier] = current
    return RateLimitResult(allowed=True, retry_after_seconds=0, limit=limit)
