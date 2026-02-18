import { readFile } from "node:fs/promises";
import path from "node:path";

const REQUIRED_CATALOG_SECTIONS = ["Projects", "Toolbox"];

function isObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function asNonEmptyString(value) {
  return typeof value === "string" && value.trim().length > 0;
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

function validateCatalogItems(messages, locale, sectionName, errors) {
  const section = messages[sectionName];
  const sectionPath = `messages/${locale}.json -> ${sectionName}.items`;

  if (!isObject(section)) {
    errors.push(`${sectionPath} missing parent section.`);
    return new Set();
  }

  const items = section.items;
  if (!Array.isArray(items)) {
    errors.push(`${sectionPath} must be an array.`);
    return new Set();
  }

  if (items.length === 0) {
    errors.push(`${sectionPath} must contain at least one item.`);
    return new Set();
  }

  const slugs = new Set();

  items.forEach((item, index) => {
    const itemPath = `${sectionPath}[${index}]`;
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
        errors.push(
          `${itemPath}.tags must be an array of non-empty strings when provided.`,
        );
      }
    }

    if (item.href !== undefined && typeof item.href !== "string") {
      errors.push(`${itemPath}.href must be a string when provided.`);
    }

    if (asNonEmptyString(item.slug)) {
      const slug = item.slug.trim();
      if (slugs.has(slug)) {
        errors.push(`${sectionPath} has duplicate slug "${slug}".`);
      } else {
        slugs.add(slug);
      }
    }
  });

  return slugs;
}

function validateSlugAlignment(sectionName, enSlugs, zhSlugs, errors) {
  const missingInZh = [...enSlugs].filter((slug) => !zhSlugs.has(slug));
  const missingInEn = [...zhSlugs].filter((slug) => !enSlugs.has(slug));

  if (missingInZh.length > 0) {
    errors.push(
      `${sectionName}.items slug mismatch: missing in zh -> ${missingInZh.join(", ")}`,
    );
  }

  if (missingInEn.length > 0) {
    errors.push(
      `${sectionName}.items slug mismatch: missing in en -> ${missingInEn.join(", ")}`,
    );
  }
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
    const enSlugs = validateCatalogItems(enMessages, "en", sectionName, errors);
    const zhSlugs = validateCatalogItems(zhMessages, "zh", sectionName, errors);
    validateSlugAlignment(sectionName, enSlugs, zhSlugs, errors);
  }

  if (errors.length > 0) {
    console.error("[content-validate] failed:");
    errors.forEach((message) => {
      console.error(`- ${message}`);
    });
    process.exit(1);
  }

  console.log(
    "[content-validate] ok: Projects.items and Toolbox.items are schema-valid and EN/ZH slugs are aligned.",
  );
}

await main();
