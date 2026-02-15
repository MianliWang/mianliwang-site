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

let writeQueue: Promise<void> = Promise.resolve();

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

export async function listAmaMessages(limit = 50): Promise<AmaMessage[]> {
  const messages = await readStoredMessages();
  return messages.slice(0, limit).map(toPublicMessage);
}

export async function createAmaMessage(input: AmaCreateInput): Promise<AmaMessage> {
  const created: AmaStoredMessage = {
    id: randomUUID(),
    name: input.name,
    email: input.email,
    message: input.message,
    createdAt: new Date().toISOString(),
  };

  writeQueue = writeQueue.then(async () => {
    const current = await readStoredMessages();
    const next = [created, ...current].slice(0, AMA_STORED_MESSAGES_LIMIT);
    await writeFile(storageFilePath, JSON.stringify(next, null, 2), "utf8");
  });

  await writeQueue;

  return toPublicMessage(created);
}
