const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX_REQUESTS = 8;

type RateBucket = {
  count: number;
  resetAt: number;
};

type RateLimitResult = {
  allowed: boolean;
  retryAfterSeconds: number;
  limit: number;
};

const buckets = new Map<string, RateBucket>();

function cleanupExpiredBuckets(now: number) {
  for (const [key, bucket] of buckets.entries()) {
    if (bucket.resetAt <= now) {
      buckets.delete(key);
    }
  }
}

export function checkTranslateRateLimit(identifier: string): RateLimitResult {
  const now = Date.now();
  cleanupExpiredBuckets(now);

  const current = buckets.get(identifier);
  if (!current || current.resetAt <= now) {
    buckets.set(identifier, {
      count: 1,
      resetAt: now + RATE_LIMIT_WINDOW_MS,
    });

    return {
      allowed: true,
      retryAfterSeconds: 0,
      limit: RATE_LIMIT_MAX_REQUESTS,
    };
  }

  if (current.count >= RATE_LIMIT_MAX_REQUESTS) {
    return {
      allowed: false,
      retryAfterSeconds: Math.max(
        1,
        Math.ceil((current.resetAt - now) / 1000),
      ),
      limit: RATE_LIMIT_MAX_REQUESTS,
    };
  }

  current.count += 1;
  buckets.set(identifier, current);

  return {
    allowed: true,
    retryAfterSeconds: 0,
    limit: RATE_LIMIT_MAX_REQUESTS,
  };
}
