import { ReadingGuide } from "@/components/motion/ReadingGuide";
import { getTranslations } from "next-intl/server";

type ReadingSection = {
  title: string;
  paragraphs: string[];
};

function parseSections(raw: unknown): ReadingSection[] {
  if (!Array.isArray(raw)) {
    return [];
  }

  return raw
    .map((item): ReadingSection | null => {
      if (!item || typeof item !== "object") {
        return null;
      }

      const candidate = item as {
        title?: unknown;
        paragraphs?: unknown;
      };

      if (typeof candidate.title !== "string") {
        return null;
      }

      if (
        !Array.isArray(candidate.paragraphs) ||
        !candidate.paragraphs.every((paragraph) => typeof paragraph === "string")
      ) {
        return null;
      }

      return {
        title: candidate.title,
        paragraphs: candidate.paragraphs,
      };
    })
    .filter((section): section is ReadingSection => section !== null);
}

export default async function ReadingPage() {
  const t = await getTranslations("ReadingDemo");
  const sections = parseSections(t.raw("sections"));

  return (
    <section className="writing-page-shell">
      <ReadingGuide scopeId="reading-demo-article" />

      <article
        id="reading-demo-article"
        className="writing-article-pad mx-auto max-w-3xl space-y-12"
      >
        <header className="space-y-5">
          <p className="text-sm uppercase tracking-[0.18em] text-muted">
            {t("eyebrow")}
          </p>
          <h1 className="text-4xl font-semibold leading-tight tracking-tight sm:text-5xl">
            {t("title")}
          </h1>
          <p data-reading-anchor className="text-lg leading-8 text-muted">
            {t("intro")}
          </p>
        </header>

        {sections.map((section, sectionIndex) => (
          <section key={section.title} className="space-y-5">
            <h2 className="text-2xl font-semibold tracking-tight">{section.title}</h2>
            {section.paragraphs.map((paragraph, paragraphIndex) => (
              <p
                key={`${sectionIndex}-${paragraphIndex}`}
                data-reading-anchor
                className="text-lg leading-8 text-muted"
              >
                {paragraph}
              </p>
            ))}
          </section>
        ))}
      </article>
    </section>
  );
}
