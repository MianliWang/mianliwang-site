export type CatalogItem = {
  slug: string;
  title: string;
  summary: string;
  tags: string[];
  href?: string;
};

function normalizeText(value: string) {
  return value.trim();
}

function normalizeTags(raw: unknown): string[] {
  if (!Array.isArray(raw)) {
    return [];
  }

  return raw
    .filter((item): item is string => typeof item === "string")
    .map((item) => normalizeText(item))
    .filter((item) => item.length > 0);
}

export function parseCatalogItems(raw: unknown): CatalogItem[] {
  if (!Array.isArray(raw)) {
    return [];
  }

  return raw
    .map((item): CatalogItem | null => {
      if (!item || typeof item !== "object") {
        return null;
      }

      const candidate = item as {
        slug?: unknown;
        title?: unknown;
        summary?: unknown;
        tags?: unknown;
        href?: unknown;
      };

      if (
        typeof candidate.slug !== "string" ||
        typeof candidate.title !== "string" ||
        typeof candidate.summary !== "string"
      ) {
        return null;
      }

      const slug = normalizeText(candidate.slug);
      const title = normalizeText(candidate.title);
      const summary = normalizeText(candidate.summary);
      const href =
        typeof candidate.href === "string" ? normalizeText(candidate.href) : "";

      if (!slug || !title || !summary) {
        return null;
      }

      return {
        slug,
        title,
        summary,
        tags: normalizeTags(candidate.tags),
        href: href || undefined,
      };
    })
    .filter((item): item is CatalogItem => item !== null);
}
