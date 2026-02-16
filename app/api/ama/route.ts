import { checkAmaRateLimit } from "@/lib/ama/rate-limit";
import { createAmaMessage, listAmaMessages } from "@/lib/ama/storage";
import {
  AMA_EMAIL_MAX_LENGTH,
  AMA_MESSAGE_MAX_LENGTH,
  AMA_NAME_MAX_LENGTH,
} from "@/lib/ama/types";
import { resolveClientIdentifier } from "@/lib/server/client-identifier";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type PostPayload = {
  name?: unknown;
  email?: unknown;
  message?: unknown;
};

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
  const clientId = resolveClientIdentifier(request);
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

  if (typeof payload.name !== "string" || typeof payload.message !== "string") {
    return NextResponse.json(
      {
        ok: false,
        error: "INVALID_FIELDS",
      },
      { status: 400 },
    );
  }

  const name = normalizeOneLine(payload.name);
  const email = typeof payload.email === "string" ? normalizeOneLine(payload.email) : "";
  const message = normalizeMessage(payload.message);
  const hasEmail = email.length > 0;

  if (
    name.length < 1 ||
    name.length > AMA_NAME_MAX_LENGTH ||
    message.length < 1 ||
    message.length > AMA_MESSAGE_MAX_LENGTH ||
    (hasEmail && (email.length > AMA_EMAIL_MAX_LENGTH || !isValidEmail(email)))
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
