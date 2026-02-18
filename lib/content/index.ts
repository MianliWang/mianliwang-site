import { access, readdir, readFile } from "node:fs/promises";
import path from "node:path";
import type { AppLocale } from "@/i18n/routing";
import type { CatalogItem } from "@/lib/content-catalog";
import { parseCatalogItems } from "@/lib/content-catalog";
import type { WritingArticle, WritingSection } from "@/lib/writing";

type WritingFrontmatter = {
  title?: string;
  date?: string;
  summary?: string;
  tags?: string[];
  eyebrow?: string;
};

export type WritingContentArticle = WritingArticle & {
  source: "content";
  date?: string;
  tags: string[];
  toc: Array<{ id: string; title: string }>;
};

type OverlayArea = "projects" | "toolbox";

const CONTENT_ROOT = path.join(process.cwd(), "content");
const WRITING_ROOT = path.join(CONTENT_ROOT, "writing");

function toUnixLines(value: string) {
  return value.replace(/\r\n/g, "\n");
}

function splitByComma(value: string) {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter((item) => item.length > 0);
}

function parseScalar(rawValue: string) {
  const value = rawValue.trim();
  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    return value.slice(1, -1).trim();
  }
  return value;
}

function parseTagsValue(value: string): string[] {
  const normalized = parseScalar(value);
  if (!normalized) {
    return [];
  }

  if (normalized.startsWith("[") && normalized.endsWith("]")) {
    const inner = normalized.slice(1, -1).trim();
    if (!inner) {
      return [];
    }

    return splitByComma(inner).map((item) => parseScalar(item));
  }

  return splitByComma(normalized).map((item) => parseScalar(item));
}

function parseFrontmatter(raw: string): {
  frontmatter: WritingFrontmatter;
  body: string;
} {
  const normalized = toUnixLines(raw);
  const match = normalized.match(/^---\n([\s\S]*?)\n---\n?/);
  if (!match) {
    return {
      frontmatter: {},
      body: normalized,
    };
  }

  const frontmatterRaw = match[1];
  const lines = frontmatterRaw.split("\n");
  const data: WritingFrontmatter = {};

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index]?.trim() ?? "";
    if (!line || line.startsWith("#")) {
      continue;
    }

    const delimiterIndex = line.indexOf(":");
    if (delimiterIndex === -1) {
      continue;
    }

    const key = line.slice(0, delimiterIndex).trim();
    const rawValue = line.slice(delimiterIndex + 1).trim();

    if (key === "tags") {
      if (!rawValue) {
        const tags: string[] = [];
        let cursor = index + 1;
        while (cursor < lines.length) {
          const tagLine = lines[cursor]?.trim() ?? "";
          if (!tagLine.startsWith("- ")) {
            break;
          }
          const value = parseScalar(tagLine.slice(2));
          if (value) {
            tags.push(value);
          }
          cursor += 1;
        }
        index = cursor - 1;
        data.tags = tags;
        continue;
      }

      data.tags = parseTagsValue(rawValue);
      continue;
    }

    const parsed = parseScalar(rawValue);
    if (key === "title" || key === "date" || key === "summary" || key === "eyebrow") {
      if (parsed) {
        data[key] = parsed;
      }
    }
  }

  return {
    frontmatter: data,
    body: normalized.slice(match[0].length),
  };
}

function normalizeBlockText(block: string) {
  return block
    .split("\n")
    .map((line) =>
      line
        .trim()
        .replace(/^[-*+]\s+/, "")
        .replace(/^\d+\.\s+/, "")
        .replace(/^>\s+/, ""),
    )
    .filter((line) => line.length > 0)
    .join(" ");
}

function slugifyHeading(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s-]/gu, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

function parseMdxBodyToSections(
  body: string,
  locale: AppLocale,
  fallbackTitle: string,
): {
  intro: string;
  sections: WritingSection[];
  toc: Array<{ id: string; title: string }>;
} {
  const blocks = toUnixLines(body)
    .split(/\n{2,}/)
    .map((block) => block.trim())
    .filter((block) => block.length > 0);

  const toc: Array<{ id: string; title: string }> = [];
  const introParts: string[] = [];
  const sections: WritingSection[] = [];
  let currentSectionTitle: string | null = null;
  let currentParagraphs: string[] = [];

  const pushSection = () => {
    if (!currentSectionTitle || currentParagraphs.length === 0) {
      return;
    }

    sections.push({
      title: currentSectionTitle,
      paragraphs: currentParagraphs,
    });
  };

  for (const block of blocks) {
    if (block.startsWith("## ")) {
      pushSection();
      const title = normalizeBlockText(block.slice(3));
      currentSectionTitle = title || fallbackTitle;
      currentParagraphs = [];
      toc.push({
        id: slugifyHeading(currentSectionTitle),
        title: currentSectionTitle,
      });
      continue;
    }

    if (block.startsWith("# ")) {
      continue;
    }

    const paragraph = normalizeBlockText(block);
    if (!paragraph) {
      continue;
    }

    if (!currentSectionTitle) {
      introParts.push(paragraph);
      continue;
    }

    currentParagraphs.push(paragraph);
  }

  pushSection();

  const fallbackSectionTitle = locale === "zh" ? "正文" : "Notes";
  if (sections.length === 0) {
    const paragraphs = introParts.length > 0 ? introParts : [fallbackTitle];
    sections.push({
      title: fallbackSectionTitle,
      paragraphs,
    });
    toc.push({
      id: slugifyHeading(fallbackSectionTitle),
      title: fallbackSectionTitle,
    });
  }

  const intro =
    introParts[0] ??
    sections[0]?.paragraphs[0] ??
    (locale === "zh" ? "内容待完善。" : "Content coming soon.");

  return {
    intro,
    sections,
    toc,
  };
}

function estimateReadingMinutes(text: string) {
  const latinWords = (text.match(/[A-Za-z0-9]+/g) ?? []).length;
  const cjkChars = (text.match(/[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}]/gu) ?? [])
    .length;
  const latinMinutes = latinWords / 220;
  const cjkMinutes = cjkChars / 500;
  return Math.max(1, Math.ceil(latinMinutes + cjkMinutes));
}

function formatReadingTime(minutes: number, locale: AppLocale) {
  if (locale === "zh") {
    return `约 ${minutes} 分钟`;
  }
  return `${minutes} min read`;
}

function isLocale(value: string): value is AppLocale {
  return value === "en" || value === "zh";
}

async function pathExists(value: string) {
  try {
    await access(value);
    return true;
  } catch {
    return false;
  }
}

function parseWritingFileName(name: string): { slug: string; locale: AppLocale } | null {
  const match = name.match(/^(.+)\.(en|zh)\.mdx$/);
  if (!match) {
    return null;
  }

  const slug = match[1]?.trim();
  const locale = match[2];
  if (!slug || !isLocale(locale)) {
    return null;
  }

  return {
    slug,
    locale,
  };
}

async function listWritingFiles(locale: AppLocale) {
  if (!(await pathExists(WRITING_ROOT))) {
    return [];
  }

  const entries = await readdir(WRITING_ROOT, { withFileTypes: true });
  return entries
    .filter((entry) => entry.isFile())
    .map((entry) => parseWritingFileName(entry.name))
    .filter((entry): entry is { slug: string; locale: AppLocale } => entry !== null)
    .filter((entry) => entry.locale === locale)
    .map((entry) => entry.slug);
}

async function readWritingMdx(
  locale: AppLocale,
  slug: string,
): Promise<WritingContentArticle | null> {
  const filePath = path.join(WRITING_ROOT, `${slug}.${locale}.mdx`);
  if (!(await pathExists(filePath))) {
    return null;
  }

  const raw = await readFile(filePath, "utf8");
  const { frontmatter, body } = parseFrontmatter(raw);
  const parsedTitle = (frontmatter.title ?? "").trim();
  if (!parsedTitle) {
    return null;
  }

  const { intro, sections, toc } = parseMdxBodyToSections(body, locale, parsedTitle);
  const summary = (frontmatter.summary ?? "").trim() || intro;
  const minutes = estimateReadingMinutes(body);

  return {
    source: "content",
    slug,
    eyebrow: frontmatter.eyebrow?.trim() || (locale === "zh" ? "写作内容" : "Writing"),
    title: parsedTitle,
    summary,
    readingTime: formatReadingTime(minutes, locale),
    intro,
    sections,
    date: frontmatter.date?.trim(),
    tags: frontmatter.tags ?? [],
    toc,
  };
}

function compareByDateDesc(
  a: { date?: string; title: string },
  b: { date?: string; title: string },
) {
  const aTime = a.date ? Date.parse(a.date) : Number.NaN;
  const bTime = b.date ? Date.parse(b.date) : Number.NaN;
  const aValid = Number.isFinite(aTime);
  const bValid = Number.isFinite(bTime);

  if (aValid && bValid && aTime !== bTime) {
    return bTime - aTime;
  }

  if (aValid && !bValid) {
    return -1;
  }

  if (!aValid && bValid) {
    return 1;
  }

  return a.title.localeCompare(b.title);
}

export async function listWritingArticlesFromContent(locale: AppLocale) {
  const slugs = await listWritingFiles(locale);
  const results = await Promise.all(slugs.map((slug) => readWritingMdx(locale, slug)));
  return results
    .filter((item): item is WritingContentArticle => item !== null)
    .sort(compareByDateDesc);
}

export async function getWritingArticleFromContent(locale: AppLocale, slug: string) {
  return readWritingMdx(locale, slug);
}

export async function listWritingSlugsFromContent(locale: AppLocale) {
  return listWritingFiles(locale);
}

function parseOverlayPayload(raw: unknown): CatalogItem[] {
  if (Array.isArray(raw)) {
    return parseCatalogItems(raw);
  }

  if (raw && typeof raw === "object" && Array.isArray((raw as { items?: unknown }).items)) {
    return parseCatalogItems((raw as { items: unknown }).items);
  }

  return [];
}

async function listOverlayItems(area: OverlayArea, locale: AppLocale) {
  const areaRoot = path.join(CONTENT_ROOT, area);
  if (!(await pathExists(areaRoot))) {
    return [];
  }

  const entries = await readdir(areaRoot, { withFileTypes: true });
  const candidateFiles = entries
    .filter((entry) => entry.isFile() && entry.name.endsWith(`.${locale}.json`))
    .map((entry) => path.join(areaRoot, entry.name));

  const collections = await Promise.all(
    candidateFiles.map(async (filePath) => {
      try {
        const raw = await readFile(filePath, "utf8");
        return parseOverlayPayload(JSON.parse(raw));
      } catch {
        return [];
      }
    }),
  );

  const map = new Map<string, CatalogItem>();
  for (const collection of collections) {
    for (const item of collection) {
      map.set(item.slug, item);
    }
  }

  return Array.from(map.values());
}

export async function mergeCatalogItemsWithOverlay(
  area: OverlayArea,
  locale: AppLocale,
  baseItems: CatalogItem[],
) {
  const overlayItems = await listOverlayItems(area, locale);
  if (overlayItems.length === 0) {
    return baseItems;
  }

  const map = new Map<string, CatalogItem>();
  for (const item of baseItems) {
    map.set(item.slug, item);
  }

  for (const item of overlayItems) {
    map.set(item.slug, item);
  }

  return Array.from(map.values());
}
