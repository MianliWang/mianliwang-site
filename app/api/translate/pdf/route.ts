import { checkTranslateRateLimit } from "@/lib/translate/rate-limit";
import { resolveClientIdentifier } from "@/lib/server/client-identifier";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const DEFAULT_MAX_PDF_BYTES = 25 * 1024 * 1024;
const DEFAULT_TIMEOUT_MS = 5 * 60 * 1000;
const LANGUAGE_TOKEN_MAX_LENGTH = 16;
const DEFAULT_OUTPUT_MODE = "bilingual";

type OutputMode = "translated" | "bilingual";

function getNumberFromEnv(key: string, fallback: number) {
  const raw = process.env[key];
  const parsed = Number.parseInt(raw ?? "", 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

const PDF_TRANSLATE_API_BASE_URL = (
  process.env.PDF_TRANSLATE_API_BASE_URL ?? "http://localhost:8080"
).replace(/\/+$/, "");
const PDF_TRANSLATE_TIMEOUT_MS = getNumberFromEnv(
  "PDF_TRANSLATE_TIMEOUT_MS",
  DEFAULT_TIMEOUT_MS,
);
const PDF_TRANSLATE_MAX_BYTES = getNumberFromEnv(
  "PDF_TRANSLATE_MAX_BYTES",
  DEFAULT_MAX_PDF_BYTES,
);

function isValidLanguageToken(value: string) {
  if (value.length < 2 || value.length > LANGUAGE_TOKEN_MAX_LENGTH) {
    return false;
  }

  return /^[a-z0-9-]+$/i.test(value);
}

function isValidOutputMode(value: string): value is OutputMode {
  return value === "translated" || value === "bilingual";
}

async function parseErrorPayload(response: Response) {
  try {
    const payload = (await response.json()) as {
      error?: unknown;
      detail?: unknown;
    };
    return {
      error: typeof payload.error === "string" ? payload.error : "PDF_TRANSLATE_UPSTREAM_FAILED",
      detail: typeof payload.detail === "string" ? payload.detail : undefined,
    };
  } catch {
    return {
      error: "PDF_TRANSLATE_UPSTREAM_FAILED",
      detail: undefined,
    };
  }
}

export async function POST(request: Request) {
  const clientId = resolveClientIdentifier(request);
  const limit = checkTranslateRateLimit(clientId);
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

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json(
      {
        ok: false,
        error: "INVALID_FORM_DATA",
      },
      { status: 400 },
    );
  }

  const file = formData.get("file");
  const sourceLang = String(formData.get("source_lang") ?? "auto").trim().toLowerCase();
  const targetLang = String(formData.get("target_lang") ?? "en").trim().toLowerCase();
  const outputModeRaw = String(formData.get("output_mode") ?? DEFAULT_OUTPUT_MODE)
    .trim()
    .toLowerCase();
  const outputMode = isValidOutputMode(outputModeRaw)
    ? outputModeRaw
    : DEFAULT_OUTPUT_MODE;

  if (!(file instanceof File)) {
    return NextResponse.json(
      {
        ok: false,
        error: "INVALID_FIELDS",
      },
      { status: 400 },
    );
  }

  if (
    !isValidLanguageToken(sourceLang) ||
    !isValidLanguageToken(targetLang) ||
    (sourceLang === targetLang && sourceLang !== "auto")
  ) {
    return NextResponse.json(
      {
        ok: false,
        error: "INVALID_FIELDS",
      },
      { status: 400 },
    );
  }

  if (file.size <= 0) {
    return NextResponse.json(
      {
        ok: false,
        error: "EMPTY_FILE",
      },
      { status: 400 },
    );
  }

  if (file.size > PDF_TRANSLATE_MAX_BYTES) {
    return NextResponse.json(
      {
        ok: false,
        error: "FILE_TOO_LARGE",
      },
      { status: 413 },
    );
  }

  if (!file.name.toLowerCase().endsWith(".pdf")) {
    return NextResponse.json(
      {
        ok: false,
        error: "UNSUPPORTED_FILE_TYPE",
      },
      { status: 415 },
    );
  }

  const upstreamFormData = new FormData();
  upstreamFormData.append("file", file, file.name || "document.pdf");
  upstreamFormData.append("source_lang", sourceLang);
  upstreamFormData.append("target_lang", targetLang);
  upstreamFormData.append("output_mode", outputMode);

  const controller = new AbortController();
  const timeout = setTimeout(() => {
    controller.abort();
  }, PDF_TRANSLATE_TIMEOUT_MS);

  try {
    const upstreamResponse = await fetch(`${PDF_TRANSLATE_API_BASE_URL}/translate/pdf`, {
      method: "POST",
      body: upstreamFormData,
      cache: "no-store",
      signal: controller.signal,
    });

    if (!upstreamResponse.ok) {
      const payload = await parseErrorPayload(upstreamResponse);
      return NextResponse.json(
        {
          ok: false,
          error: payload.error,
          detail: payload.detail,
        },
        { status: upstreamResponse.status },
      );
    }

    const contentType = upstreamResponse.headers.get("content-type") ?? "";
    if (!contentType.toLowerCase().includes("application/pdf")) {
      return NextResponse.json(
        {
          ok: false,
          error: "PDF_TRANSLATE_UPSTREAM_FAILED",
        },
        { status: 502 },
      );
    }

    const fileBytes = await upstreamResponse.arrayBuffer();
    const contentDisposition =
      upstreamResponse.headers.get("content-disposition") ??
      `attachment; filename="translated.${outputMode}.pdf"`;

    return new NextResponse(fileBytes, {
      status: 200,
      headers: {
        "Cache-Control": "no-store",
        "Content-Type": "application/pdf",
        "Content-Disposition": contentDisposition,
      },
    });
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      return NextResponse.json(
        {
          ok: false,
          error: "PDF_TRANSLATE_UPSTREAM_TIMEOUT",
        },
        { status: 504 },
      );
    }

    return NextResponse.json(
      {
        ok: false,
        error: "PDF_TRANSLATE_SERVICE_UNAVAILABLE",
      },
      { status: 503 },
    );
  } finally {
    clearTimeout(timeout);
  }
}
