import { checkTranslateRateLimit } from "@/lib/translate/rate-limit";
import { resolveClientIdentifier } from "@/lib/server/client-identifier";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type TranslatePayload = {
  text?: unknown;
  sourceLang?: unknown;
  targetLang?: unknown;
};

type OpenAIContentPart = {
  type?: string;
  text?: string;
};

type OpenAIOutputItem = {
  content?: OpenAIContentPart[];
};

type OpenAIResponsePayload = {
  output_text?: string;
  output?: OpenAIOutputItem[];
  error?: {
    message?: string;
  };
};

const OPENAI_ENDPOINT = "https://api.openai.com/v1/responses";
const OPENAI_TIMEOUT_MS = 25_000;
const MAX_TEXT_LENGTH = Number.parseInt(
  process.env.OPENAI_TRANSLATE_MAX_INPUT_CHARS ?? "12000",
  10,
);
const LANGUAGE_TOKEN_MAX_LENGTH = 16;


function isValidLanguageToken(value: string) {
  if (value.length < 2 || value.length > LANGUAGE_TOKEN_MAX_LENGTH) {
    return false;
  }

  return /^[a-z0-9-]+$/i.test(value);
}

function extractTranslatedText(payload: OpenAIResponsePayload): string | null {
  if (typeof payload.output_text === "string" && payload.output_text.trim()) {
    return payload.output_text;
  }

  if (!Array.isArray(payload.output)) {
    return null;
  }

  const chunks: string[] = [];
  for (const item of payload.output) {
    if (!Array.isArray(item.content)) {
      continue;
    }

    for (const part of item.content) {
      if (typeof part.text === "string" && part.text.trim()) {
        chunks.push(part.text);
      }
    }
  }

  return chunks.length > 0 ? chunks.join("\n") : null;
}

async function requestTranslationFromOpenAI(
  text: string,
  sourceLang: string,
  targetLang: string,
  signal: AbortSignal,
) {
  const model = process.env.OPENAI_TRANSLATE_MODEL ?? "gpt-4.1-mini";
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    throw new Error("OPENAI_NOT_CONFIGURED");
  }

  const response = await fetch(OPENAI_ENDPOINT, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    cache: "no-store",
    body: JSON.stringify({
      model,
      input: [
        {
          role: "system",
          content: [
            {
              type: "input_text",
              text: "You are a professional translator. Translate the user text from source language to target language. Preserve meaning, structure, list markers, and line breaks. Return only translated text without explanations.",
            },
          ],
        },
        {
          role: "user",
          content: [
            {
              type: "input_text",
              text: `Source language: ${sourceLang}\nTarget language: ${targetLang}\n\nText:\n${text}`,
            },
          ],
        },
      ],
    }),
    signal,
  });

  const payload = (await response.json()) as OpenAIResponsePayload;
  if (!response.ok) {
    const message = payload.error?.message;
    throw new Error(message ? `OPENAI_ERROR:${message}` : "OPENAI_ERROR");
  }

  const translatedText = extractTranslatedText(payload);
  if (!translatedText) {
    throw new Error("OPENAI_EMPTY_OUTPUT");
  }

  return translatedText;
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

  let payload: TranslatePayload;
  try {
    payload = (await request.json()) as TranslatePayload;
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
    typeof payload.text !== "string" ||
    typeof payload.sourceLang !== "string" ||
    typeof payload.targetLang !== "string"
  ) {
    return NextResponse.json(
      {
        ok: false,
        error: "INVALID_FIELDS",
      },
      { status: 400 },
    );
  }

  const rawText = payload.text;
  const sourceLang = payload.sourceLang.trim().toLowerCase();
  const targetLang = payload.targetLang.trim().toLowerCase();

  if (
    !rawText.trim() ||
    rawText.length > MAX_TEXT_LENGTH ||
    !isValidLanguageToken(sourceLang) ||
    !isValidLanguageToken(targetLang)
  ) {
    return NextResponse.json(
      {
        ok: false,
        error: "INVALID_FIELDS",
      },
      { status: 400 },
    );
  }

  if (sourceLang === targetLang && sourceLang !== "auto") {
    return NextResponse.json({
      ok: true,
      translatedText: rawText,
    });
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => {
    controller.abort();
  }, OPENAI_TIMEOUT_MS);

  try {
    const translatedText = await requestTranslationFromOpenAI(
      rawText,
      sourceLang,
      targetLang,
      controller.signal,
    );

    return NextResponse.json({
      ok: true,
      translatedText,
    });
  } catch (error) {
    console.error("Translate route failed", error);

    if (error instanceof Error && error.message === "OPENAI_NOT_CONFIGURED") {
      return NextResponse.json(
        {
          ok: false,
          error: "OPENAI_NOT_CONFIGURED",
        },
        { status: 503 },
      );
    }

    if (error instanceof DOMException && error.name === "AbortError") {
      return NextResponse.json(
        {
          ok: false,
          error: "UPSTREAM_TIMEOUT",
        },
        { status: 504 },
      );
    }

    return NextResponse.json(
      {
        ok: false,
        error: "UPSTREAM_FAILED",
      },
      { status: 502 },
    );
  } finally {
    clearTimeout(timeout);
  }
}
