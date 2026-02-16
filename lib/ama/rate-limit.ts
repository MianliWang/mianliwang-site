const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX_REQUESTS = 5;

const RATE_LIMIT_WINDOW_SECONDS = Math.ceil(RATE_LIMIT_WINDOW_MS / 1000);
const DEFAULT_RATE_LIMIT_RETRY_SECONDS = RATE_LIMIT_WINDOW_SECONDS;

const upstashRestUrl = process.env.UPSTASH_REDIS_REST_URL;
const upstashRestToken = process.env.UPSTASH_REDIS_REST_TOKEN;
const upstashRatePrefix = process.env.AMA_UPSTASH_RATE_PREFIX ?? "ama:rate";

let warnedMissingUpstashConfig = false;

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

function checkAmaRateLimitMemory(identifier: string): RateLimitResult {
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

function shouldUseUpstashRateLimit() {
  const configured = process.env.AMA_RATE_LIMIT_BACKEND;
  const upstashConfigured = Boolean(upstashRestUrl && upstashRestToken);
  const preferUpstash =
    configured === "upstash" ||
    (!configured && process.env.AMA_STORAGE_BACKEND === "upstash");

  if (preferUpstash && !upstashConfigured) {
    if (!warnedMissingUpstashConfig) {
      warnedMissingUpstashConfig = true;
      console.warn(
        "AMA rate limit requested Upstash backend but UPSTASH_REDIS_REST_URL/TOKEN is missing. Falling back to memory rate limit.",
      );
    }
    return false;
  }

  return preferUpstash && upstashConfigured;
}

async function runUpstashCommand<T>(
  command: Array<string | number>,
): Promise<T> {
  if (!upstashRestUrl || !upstashRestToken) {
    throw new Error("Upstash rate-limit backend is not configured.");
  }

  const response = await fetch(upstashRestUrl, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${upstashRestToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(command),
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`Upstash request failed: ${response.status}`);
  }

  const json = (await response.json()) as { result?: T; error?: string };
  if (json.error) {
    throw new Error(`Upstash command failed: ${json.error}`);
  }

  return (json.result ?? null) as T;
}

async function checkAmaRateLimitUpstash(
  identifier: string,
): Promise<RateLimitResult> {
  const key = `${upstashRatePrefix}:${identifier}`;
  const count = Number(await runUpstashCommand<number>(["INCR", key]));

  if (count === 1) {
    await runUpstashCommand<number>(["EXPIRE", key, RATE_LIMIT_WINDOW_SECONDS]);
  }

  if (count > RATE_LIMIT_MAX_REQUESTS) {
    const ttlSeconds = Number(await runUpstashCommand<number>(["TTL", key]));
    return {
      allowed: false,
      retryAfterSeconds:
        ttlSeconds > 0 ? ttlSeconds : DEFAULT_RATE_LIMIT_RETRY_SECONDS,
      limit: RATE_LIMIT_MAX_REQUESTS,
    };
  }

  return {
    allowed: true,
    retryAfterSeconds: 0,
    limit: RATE_LIMIT_MAX_REQUESTS,
  };
}

export async function checkAmaRateLimit(
  identifier: string,
): Promise<RateLimitResult> {
  if (!shouldUseUpstashRateLimit()) {
    return checkAmaRateLimitMemory(identifier);
  }

  try {
    return await checkAmaRateLimitUpstash(identifier);
  } catch {
    return checkAmaRateLimitMemory(identifier);
  }
}
