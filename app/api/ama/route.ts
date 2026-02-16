import { createHash } from "node:crypto";
import { isIP } from "node:net";
import { checkAmaRateLimit } from "@/lib/ama/rate-limit";
import { createAmaMessage, listAmaMessages } from "@/lib/ama/storage";
import {
  AMA_EMAIL_MAX_LENGTH,
  AMA_MESSAGE_MAX_LENGTH,
  AMA_NAME_MAX_LENGTH,
} from "@/lib/ama/types";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type PostPayload = {
  name?: unknown;
  email?: unknown;
  message?: unknown;
};

const TRUSTED_IP_HEADERS = [
  "x-vercel-forwarded-for",
  "cf-connecting-ip",
  "x-real-ip",
] as const;

function normalizeIpToken(value: string): string | null {
  const token = value.trim();
  if (!token) {
    return null;
  }

  const bracketedIpv6 = token.match(/^\[([^\]]+)\](?::\d+)?$/);
  if (bracketedIpv6 && isIP(bracketedIpv6[1])) {
    return bracketedIpv6[1];
  }

  if (isIP(token)) {
    return token;
  }

  const ipv4WithPort = token.match(/^(\d{1,3}(?:\.\d{1,3}){3}):\d+$/);
  if (ipv4WithPort && isIP(ipv4WithPort[1])) {
    return ipv4WithPort[1];
  }

  return null;
}

function parsePossiblyForwardedHeader(value: string): string | null {
  const candidates = value
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);

  for (let index = candidates.length - 1; index >= 0; index -= 1) {
    const parsed = normalizeIpToken(candidates[index]);
    if (parsed) {
      return parsed;
    }
  }

  return null;
}

function buildFallbackIdentifier(request: Request): string {
  const fingerprint = [
    request.headers.get("user-agent") ?? "",
    request.headers.get("accept-language") ?? "",
    request.headers.get("sec-ch-ua-platform") ?? "",
    request.headers.get("host") ?? "",
  ].join("|");

  const digest = createHash("sha256")
    .update(fingerprint)
    .digest("hex")
    .slice(0, 20);

  return `fp:${digest}`;
}

function getClientIdentifier(request: Request): string {
  for (const header of TRUSTED_IP_HEADERS) {
    const headerValue = request.headers.get(header);
    if (!headerValue) {
      continue;
    }

    const ip = parsePossiblyForwardedHeader(headerValue);
    if (ip) {
      return `ip:${ip}`;
    }
  }

  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    const ip = parsePossiblyForwardedHeader(forwarded);
    if (ip) {
      return `ip:${ip}`;
    }
  }

  return buildFallbackIdentifier(request);
}

function normalizeOneLine(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

function normalizeMessage(value: string) {
  return value.replace(/\r\n/g, "\n").trim();
}

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

export async function GET() {
  try {
    const items = await listAmaMessages(50);
    return NextResponse.json({ items });
  } catch (error) {
    console.error("AMA list failed", error);
    return NextResponse.json(
      {
        items: [],
        error: "STORAGE_UNAVAILABLE",
      },
      { status: 503 },
    );
  }
}

export async function POST(request: Request) {
  const clientId = getClientIdentifier(request);
  const limit = await checkAmaRateLimit(clientId);
  if (!limit.allowed) {
    return NextResponse.json(
      {
        ok: false,
        error: "RATE_LIMITED",
      },
      {
        status: 429,
        headers: {
          "Retry-After": String(limit.retryAfterSeconds),
        },
      },
    );
  }

  let payload: PostPayload;
  try {
    payload = (await request.json()) as PostPayload;
  } catch {
    return NextResponse.json(
      {
        ok: false,
        error: "INVALID_JSON",
      },
      { status: 400 },
    );
  }

  if (
    typeof payload.name !== "string" ||
    typeof payload.email !== "string" ||
    typeof payload.message !== "string"
  ) {
    return NextResponse.json(
      {
        ok: false,
        error: "INVALID_FIELDS",
      },
      { status: 400 },
    );
  }

  const name = normalizeOneLine(payload.name);
  const email = normalizeOneLine(payload.email);
  const message = normalizeMessage(payload.message);

  if (
    name.length < 1 ||
    name.length > AMA_NAME_MAX_LENGTH ||
    email.length < 3 ||
    email.length > AMA_EMAIL_MAX_LENGTH ||
    message.length < 1 ||
    message.length > AMA_MESSAGE_MAX_LENGTH ||
    !isValidEmail(email)
  ) {
    return NextResponse.json(
      {
        ok: false,
        error: "INVALID_FIELDS",
      },
      { status: 400 },
    );
  }

  let item: Awaited<ReturnType<typeof createAmaMessage>>;
  try {
    item = await createAmaMessage({
      name,
      email,
      message,
    });
  } catch (error) {
    console.error("AMA create failed", error);
    return NextResponse.json(
      {
        ok: false,
        error: "STORAGE_UNAVAILABLE",
      },
      { status: 503 },
    );
  }

  return NextResponse.json(
    {
      ok: true,
      item,
    },
    { status: 201 },
  );
}
