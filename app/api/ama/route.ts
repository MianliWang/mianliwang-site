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

function getClientIdentifier(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    const firstIp = forwarded.split(",")[0]?.trim();
    if (firstIp) {
      return firstIp;
    }
  }

  const realIp = request.headers.get("x-real-ip")?.trim();
  if (realIp) {
    return realIp;
  }

  return "local";
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
  const items = await listAmaMessages(50);
  return NextResponse.json({ items });
}

export async function POST(request: Request) {
  const clientId = getClientIdentifier(request);
  const limit = checkAmaRateLimit(clientId);
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

  const item = await createAmaMessage({
    name,
    email,
    message,
  });

  return NextResponse.json(
    {
      ok: true,
      item,
    },
    { status: 201 },
  );
}
