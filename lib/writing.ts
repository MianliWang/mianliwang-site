export type WritingSection = {
  title: string;
  paragraphs: string[];
};

export type WritingArticle = {
  slug: string;
  eyebrow: string;
  title: string;
  summary: string;
  readingTime: string;
  intro: string;
  sections: WritingSection[];
};

export function parseWritingArticles(raw: unknown): WritingArticle[] {
  if (!Array.isArray(raw)) {
    return [];
  }

  return raw
    .map((item): WritingArticle | null => {
      if (!item || typeof item !== "object") {
        return null;
      }

      const candidate = item as {
        slug?: unknown;
        eyebrow?: unknown;
        title?: unknown;
        summary?: unknown;
        readingTime?: unknown;
        intro?: unknown;
        sections?: unknown;
      };

      if (
        typeof candidate.slug !== "string" ||
        typeof candidate.eyebrow !== "string" ||
        typeof candidate.title !== "string" ||
        typeof candidate.summary !== "string" ||
        typeof candidate.readingTime !== "string" ||
        typeof candidate.intro !== "string" ||
        !Array.isArray(candidate.sections)
      ) {
        return null;
      }

      const sections = candidate.sections
        .map((section): WritingSection | null => {
          if (!section || typeof section !== "object") {
            return null;
          }

          const value = section as {
            title?: unknown;
            paragraphs?: unknown;
          };

          if (
            typeof value.title !== "string" ||
            !Array.isArray(value.paragraphs) ||
            !value.paragraphs.every((paragraph) => typeof paragraph === "string")
          ) {
            return null;
          }

          return {
            title: value.title,
            paragraphs: value.paragraphs,
          };
        })
        .filter((section): section is WritingSection => section !== null);

      if (sections.length === 0) {
        return null;
      }

      return {
        slug: candidate.slug,
        eyebrow: candidate.eyebrow,
        title: candidate.title,
        summary: candidate.summary,
        readingTime: candidate.readingTime,
        intro: candidate.intro,
        sections,
      };
    })
    .filter((article): article is WritingArticle => article !== null);
}
