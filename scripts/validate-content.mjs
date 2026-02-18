import { access, readdir, readFile } from "node:fs/promises";
import path from "node:path";

const LOCALES = ["en", "zh"];
const REQUIRED_CATALOG_SECTIONS = ["Projects", "Toolbox"];
const CONTENT_ROOT = path.join(process.cwd(), "content");
const WRITING_ROOT = path.join(CONTENT_ROOT, "writing");
const WRITING_STRICT_BILINGUAL = true;

function isObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function asNonEmptyString(value) {
  return typeof value === "string" && value.trim().length > 0;
}

async function pathExists(targetPath) {
  try {
    await access(targetPath);
    return true;
  } catch {
    return false;
  }
}

function splitComma(value) {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter((item) => item.length > 0);
}

function parseScalar(raw) {
  const value = raw.trim();
  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    return value.slice(1, -1).trim();
  }
  return value;
}

function parseFrontmatter(raw) {
  const normalized = raw.replace(/\r\n/g, "\n");
  const match = normalized.match(/^---\n([\s\S]*?)\n---\n?/);
  if (!match) {
    return { data: {}, body: normalized };
  }

  const lines = match[1].split("\n");
  const data = {};

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index]?.trim() ?? "";
    if (!line || line.startsWith("#")) {
      continue;
    }

    const separator = line.indexOf(":");
    if (separator === -1) {
      continue;
    }

    const key = line.slice(0, separator).trim();
    const rawValue = line.slice(separator + 1).trim();

    if (key === "tags") {
      if (!rawValue) {
        const tags = [];
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

      const parsed = parseScalar(rawValue);
      if (parsed.startsWith("[") && parsed.endsWith("]")) {
        data.tags = splitComma(parsed.slice(1, -1)).map((item) => parseScalar(item));
      } else {
        data.tags = splitComma(parsed).map((item) => parseScalar(item));
      }
      continue;
    }

    if (key === "title" || key === "date" || key === "summary" || key === "eyebrow") {
      const parsed = parseScalar(rawValue);
      if (parsed) {
        data[key] = parsed;
      }
    }
  }

  return {
    data,
    body: normalized.slice(match[0].length),
  };
}

async function readMessagesFile(locale) {
  const filePath = path.join(process.cwd(), "messages", `${locale}.json`);
  const raw = await readFile(filePath, "utf8");
  const parsed = JSON.parse(raw);

  if (!isObject(parsed)) {
    throw new Error(`[content-validate] ${filePath} is not a JSON object.`);
  }

  return parsed;
}

function validateCatalogItems(rawItems, itemPathPrefix, errors) {
  if (!Array.isArray(rawItems)) {
    errors.push(`${itemPathPrefix} must be an array.`);
    return new Set();
  }

  if (rawItems.length === 0) {
    errors.push(`${itemPathPrefix} must contain at least one item.`);
    return new Set();
  }

  const slugs = new Set();

  rawItems.forEach((item, index) => {
    const itemPath = `${itemPathPrefix}[${index}]`;

    if (!isObject(item)) {
      errors.push(`${itemPath} must be an object.`);
      return;
    }

    if (!asNonEmptyString(item.slug)) {
      errors.push(`${itemPath}.slug must be a non-empty string.`);
    }

    if (!asNonEmptyString(item.title)) {
      errors.push(`${itemPath}.title must be a non-empty string.`);
    }

    if (!asNonEmptyString(item.summary)) {
      errors.push(`${itemPath}.summary must be a non-empty string.`);
    }

    if (item.tags !== undefined) {
      if (
        !Array.isArray(item.tags) ||
        item.tags.some((tag) => !asNonEmptyString(tag))
      ) {
        errors.push(`${itemPath}.tags must be an array of non-empty strings.`);
      }
    }

    if (item.href !== undefined && typeof item.href !== "string") {
      errors.push(`${itemPath}.href must be a string when provided.`);
    }

    if (asNonEmptyString(item.slug)) {
      const slug = item.slug.trim();
      if (slugs.has(slug)) {
        errors.push(`${itemPathPrefix} has duplicate slug "${slug}".`);
      } else {
        slugs.add(slug);
      }
    }
  });

  return slugs;
}

function validateMessageCatalogSection(messages, locale, sectionName, errors) {
  const sectionPath = `messages/${locale}.json -> ${sectionName}.items`;
  const section = messages[sectionName];

  if (!isObject(section)) {
    errors.push(`${sectionPath} missing parent section.`);
    return new Set();
  }

  return validateCatalogItems(section.items, sectionPath, errors);
}

function validateWritingMessageSection(messages, locale, errors) {
  const sectionPath = `messages/${locale}.json -> Writing.articles`;
  const writing = messages.Writing;

  if (!isObject(writing) || !Array.isArray(writing.articles)) {
    errors.push(`${sectionPath} must be an array.`);
    return new Set();
  }

  const slugs = new Set();
  writing.articles.forEach((article, index) => {
    const itemPath = `${sectionPath}[${index}]`;
    if (!isObject(article) || !asNonEmptyString(article.slug)) {
      errors.push(`${itemPath}.slug must be a non-empty string.`);
      return;
    }

    const slug = article.slug.trim();
    if (slugs.has(slug)) {
      errors.push(`${sectionPath} has duplicate slug "${slug}".`);
      return;
    }
    slugs.add(slug);
  });

  return slugs;
}

function validateSlugAlignment(label, enSlugs, zhSlugs, errors) {
  const missingInZh = [...enSlugs].filter((slug) => !zhSlugs.has(slug));
  const missingInEn = [...zhSlugs].filter((slug) => !enSlugs.has(slug));

  if (missingInZh.length > 0) {
    errors.push(`${label} slug mismatch: missing in zh -> ${missingInZh.join(", ")}`);
  }

  if (missingInEn.length > 0) {
    errors.push(`${label} slug mismatch: missing in en -> ${missingInEn.join(", ")}`);
  }
}

async function validateWritingContent(errors) {
  const result = {
    en: new Set(),
    zh: new Set(),
  };

  if (!(await pathExists(WRITING_ROOT))) {
    return result;
  }

  const entries = await readdir(WRITING_ROOT, { withFileTypes: true });
  const pairs = new Map();

  for (const entry of entries) {
    if (!entry.isFile()) {
      continue;
    }

    const match = entry.name.match(/^(.+)\.(en|zh)\.mdx$/);
    if (!match) {
      continue;
    }

    const slug = match[1]?.trim();
    const locale = match[2];
    if (!slug || !LOCALES.includes(locale)) {
      continue;
    }

    const localeSet = result[locale];
    if (localeSet.has(slug)) {
      errors.push(`content/writing duplicate slug for locale "${locale}": ${slug}`);
      continue;
    }
    localeSet.add(slug);

    const currentPair = pairs.get(slug) ?? {};
    currentPair[locale] = path.join(WRITING_ROOT, entry.name);
    pairs.set(slug, currentPair);

    const raw = await readFile(path.join(WRITING_ROOT, entry.name), "utf8");
    const { data } = parseFrontmatter(raw);
    const title = typeof data.title === "string" ? data.title.trim() : "";
    if (!title) {
      errors.push(`content/writing/${entry.name} frontmatter.title is required.`);
    }

    if (typeof data.date === "string" && data.date.trim()) {
      const parsed = Date.parse(data.date);
      if (!Number.isFinite(parsed)) {
        errors.push(
          `content/writing/${entry.name} frontmatter.date must be a parseable date.`,
        );
      }
    }
  }

  if (WRITING_STRICT_BILINGUAL) {
    for (const [slug, pair] of pairs.entries()) {
      if (!pair.en || !pair.zh) {
        errors.push(
          `content/writing bilingual mismatch for slug "${slug}": expected both .en.mdx and .zh.mdx.`,
        );
      }
    }
  }

  return result;
}

function parseOverlayJson(raw) {
  if (Array.isArray(raw)) {
    return raw;
  }
  if (isObject(raw) && Array.isArray(raw.items)) {
    return raw.items;
  }
  return null;
}

async function validateOverlayArea(area, errors) {
  const areaRoot = path.join(CONTENT_ROOT, area);
  const result = {
    enabled: false,
    en: new Set(),
    zh: new Set(),
  };

  if (!(await pathExists(areaRoot))) {
    return result;
  }

  const entries = await readdir(areaRoot, { withFileTypes: true });
  const jsonFiles = entries.filter((entry) => entry.isFile() && entry.name.endsWith(".json"));
  if (jsonFiles.length === 0) {
    return result;
  }

  result.enabled = true;

  for (const entry of jsonFiles) {
    const localeMatch = entry.name.match(/\.(en|zh)\.json$/);
    if (!localeMatch) {
      errors.push(
        `content/${area}/${entry.name} must include locale suffix (.en.json or .zh.json).`,
      );
      continue;
    }

    const locale = localeMatch[1];
    const filePath = path.join(areaRoot, entry.name);
    const rawText = await readFile(filePath, "utf8");
    let parsed;
    try {
      parsed = JSON.parse(rawText);
    } catch {
      errors.push(`content/${area}/${entry.name} is not valid JSON.`);
      continue;
    }

    const items = parseOverlayJson(parsed);
    if (!items) {
      errors.push(`content/${area}/${entry.name} must be an array or { items: [] }.`);
      continue;
    }

    const slugs = validateCatalogItems(
      items,
      `content/${area}/${entry.name}`,
      errors,
    );

    for (const slug of slugs) {
      const localeSet = result[locale];
      if (localeSet.has(slug)) {
        errors.push(`content/${area} duplicate slug in ${locale}: ${slug}`);
      } else {
        localeSet.add(slug);
      }
    }
  }

  if (result.enabled) {
    validateSlugAlignment(`content/${area}`, result.en, result.zh, errors);
  }

  return result;
}

async function main() {
  const errors = [];

  let enMessages;
  let zhMessages;
  try {
    [enMessages, zhMessages] = await Promise.all([
      readMessagesFile("en"),
      readMessagesFile("zh"),
    ]);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(message);
    process.exit(1);
  }

  for (const sectionName of REQUIRED_CATALOG_SECTIONS) {
    const enSlugs = validateMessageCatalogSection(
      enMessages,
      "en",
      sectionName,
      errors,
    );
    const zhSlugs = validateMessageCatalogSection(
      zhMessages,
      "zh",
      sectionName,
      errors,
    );
    validateSlugAlignment(`${sectionName}.items`, enSlugs, zhSlugs, errors);
  }

  const writingMessageEn = validateWritingMessageSection(enMessages, "en", errors);
  const writingMessageZh = validateWritingMessageSection(zhMessages, "zh", errors);
  validateSlugAlignment("Writing.articles", writingMessageEn, writingMessageZh, errors);

  const writingContent = await validateWritingContent(errors);
  const mergedWritingEn = new Set([...writingMessageEn, ...writingContent.en]);
  const mergedWritingZh = new Set([...writingMessageZh, ...writingContent.zh]);
  validateSlugAlignment("Writing merged slugs", mergedWritingEn, mergedWritingZh, errors);

  const projectsOverlay = await validateOverlayArea("projects", errors);
  const toolboxOverlay = await validateOverlayArea("toolbox", errors);
  if (projectsOverlay.enabled) {
    const mergedProjectsEn = new Set([
      ...validateMessageCatalogSection(enMessages, "en", "Projects", []),
      ...projectsOverlay.en,
    ]);
    const mergedProjectsZh = new Set([
      ...validateMessageCatalogSection(zhMessages, "zh", "Projects", []),
      ...projectsOverlay.zh,
    ]);
    validateSlugAlignment("Projects merged slugs", mergedProjectsEn, mergedProjectsZh, errors);
  }
  if (toolboxOverlay.enabled) {
    const mergedToolboxEn = new Set([
      ...validateMessageCatalogSection(enMessages, "en", "Toolbox", []),
      ...toolboxOverlay.en,
    ]);
    const mergedToolboxZh = new Set([
      ...validateMessageCatalogSection(zhMessages, "zh", "Toolbox", []),
      ...toolboxOverlay.zh,
    ]);
    validateSlugAlignment("Toolbox merged slugs", mergedToolboxEn, mergedToolboxZh, errors);
  }

  if (errors.length > 0) {
    console.error("[content-validate] failed:");
    errors.forEach((message) => console.error(`- ${message}`));
    process.exit(1);
  }

  console.log(
    "[content-validate] ok: messages + content schema checks passed (writing/projects/toolbox).",
  );
}

await main();
