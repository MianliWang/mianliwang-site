import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import {
  AMA_STORED_MESSAGES_LIMIT,
  type AmaCreateInput,
  type AmaMessage,
  type AmaStoredMessage,
} from "./types";

const dataDirectory = path.join(process.cwd(), "data");
const storageFilePath = path.join(dataDirectory, "ama-messages.json");
const upstashListKey = process.env.AMA_UPSTASH_KEY ?? "ama:messages";
const upstashRestUrl = process.env.UPSTASH_REDIS_REST_URL;
const upstashRestToken = process.env.UPSTASH_REDIS_REST_TOKEN;

let writeQueue: Promise<void> = Promise.resolve();
let warnedMissingUpstashConfig = false;

type StorageBackend = "file" | "upstash";

function resolveStorageBackend(): StorageBackend {
  const configured = process.env.AMA_STORAGE_BACKEND;
  const upstashConfigured = Boolean(upstashRestUrl && upstashRestToken);

  if (configured === "upstash" && upstashConfigured) {
    return "upstash";
  }

  if (configured === "upstash" && !upstashConfigured) {
    if (!warnedMissingUpstashConfig) {
      warnedMissingUpstashConfig = true;
      console.warn(
        "AMA_STORAGE_BACKEND=upstash but UPSTASH_REDIS_REST_URL/TOKEN is missing. Falling back to file storage.",
      );
    }
    return "file";
  }

  if (configured === "file") {
    return "file";
  }

  return upstashConfigured ? "upstash" : "file";
}

async function ensureStorageFile() {
  await mkdir(dataDirectory, { recursive: true });

  try {
    await readFile(storageFilePath, "utf8");
  } catch {
    await writeFile(storageFilePath, "[]", "utf8");
  }
}

function normalizeStoredMessages(raw: unknown): AmaStoredMessage[] {
  if (!Array.isArray(raw)) {
    return [];
  }

  return raw
    .map((item): AmaStoredMessage | null => {
      if (!item || typeof item !== "object") {
        return null;
      }

      const candidate = item as Partial<AmaStoredMessage>;
      if (
        typeof candidate.id !== "string" ||
        typeof candidate.name !== "string" ||
        typeof candidate.email !== "string" ||
        typeof candidate.message !== "string" ||
        typeof candidate.createdAt !== "string"
      ) {
        return null;
      }

      return {
        id: candidate.id,
        name: candidate.name,
        email: candidate.email,
        message: candidate.message,
        createdAt: candidate.createdAt,
      };
    })
    .filter((item): item is AmaStoredMessage => item !== null);
}

async function readStoredMessages(): Promise<AmaStoredMessage[]> {
  await ensureStorageFile();

  try {
    const raw = await readFile(storageFilePath, "utf8");
    return normalizeStoredMessages(JSON.parse(raw));
  } catch {
    return [];
  }
}

function toPublicMessage(item: AmaStoredMessage): AmaMessage {
  return {
    id: item.id,
    name: item.name,
    message: item.message,
    createdAt: item.createdAt,
  };
}

function parseJsonMessage(payload: string): AmaStoredMessage | null {
  try {
    return normalizeStoredMessages([JSON.parse(payload)])[0] ?? null;
  } catch {
    return null;
  }
}

async function runUpstashCommand<T>(
  command: Array<string | number>,
): Promise<T> {
  if (!upstashRestUrl || !upstashRestToken) {
    throw new Error("Upstash storage is not configured.");
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

async function listAmaMessagesFromFile(limit: number): Promise<AmaMessage[]> {
  const messages = await readStoredMessages();
  return messages.slice(0, limit).map(toPublicMessage);
}

async function listAmaMessagesFromUpstash(limit: number): Promise<AmaMessage[]> {
  const safeLimit = Math.max(1, Math.min(limit, AMA_STORED_MESSAGES_LIMIT));
  const rawEntries =
    (await runUpstashCommand<string[]>([
      "LRANGE",
      upstashListKey,
      0,
      safeLimit - 1,
    ])) ?? [];

  const items = rawEntries
    .map(parseJsonMessage)
    .filter((item): item is AmaStoredMessage => item !== null)
    .slice(0, safeLimit);

  return items.map(toPublicMessage);
}

async function createAmaMessageInFile(
  created: AmaStoredMessage,
): Promise<AmaMessage> {
  writeQueue = writeQueue
    .catch(() => undefined)
    .then(async () => {
      const current = await readStoredMessages();
      const next = [created, ...current].slice(0, AMA_STORED_MESSAGES_LIMIT);
      await writeFile(storageFilePath, JSON.stringify(next, null, 2), "utf8");
    });

  await writeQueue;
  return toPublicMessage(created);
}

async function createAmaMessageInUpstash(
  created: AmaStoredMessage,
): Promise<AmaMessage> {
  await runUpstashCommand<number>([
    "LPUSH",
    upstashListKey,
    JSON.stringify(created),
  ]);
  await runUpstashCommand<string>([
    "LTRIM",
    upstashListKey,
    0,
    AMA_STORED_MESSAGES_LIMIT - 1,
  ]);

  return toPublicMessage(created);
}

export async function listAmaMessages(limit = 50): Promise<AmaMessage[]> {
  const backend = resolveStorageBackend();
  if (backend === "upstash") {
    return listAmaMessagesFromUpstash(limit);
  }

  return listAmaMessagesFromFile(limit);
}

export async function createAmaMessage(input: AmaCreateInput): Promise<AmaMessage> {
  const created: AmaStoredMessage = {
    id: randomUUID(),
    name: input.name,
    email: input.email,
    message: input.message,
    createdAt: new Date().toISOString(),
  };

  const backend = resolveStorageBackend();
  if (backend === "upstash") {
    return createAmaMessageInUpstash(created);
  }

  return createAmaMessageInFile(created);
}
