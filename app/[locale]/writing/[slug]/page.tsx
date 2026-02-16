import { ReadingHUD } from "@/components/motion/ReadingHUD";
import { routing } from "@/i18n/routing";
import { parseWritingArticles } from "@/lib/writing";
import enMessages from "@/messages/en.json";
import zhMessages from "@/messages/zh.json";
import { getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";

type WritingArticlePageProps = {
  params: Promise<{ locale: string; slug: string }>;
};

const writingMessagesByLocale = {
  en: enMessages.Writing?.articles,
  zh: zhMessages.Writing?.articles,
} as const;

export function generateStaticParams() {
  return routing.locales.flatMap((locale) => {
    const entries = parseWritingArticles(writingMessagesByLocale[locale]);
    return entries.map((entry) => ({
      locale,
      slug: entry.slug,
    }));
  });
}

export default async function WritingArticlePage({
  params,
}: WritingArticlePageProps) {
  const { slug } = await params;
  const t = await getTranslations("Writing");
  const article = parseWritingArticles(t.raw("articles")).find(
    (entry) => entry.slug === slug,
  );

  if (!article) {
    notFound();
  }

  const articleId = `writing-article-${article.slug}`;

  return (
    <section className="relative">
      <ReadingHUD scopeId={articleId} />

      <article id={articleId} className="mx-auto max-w-3xl space-y-12 pb-10">
        <header className="space-y-5">
          <p className="t-eyebrow">{article.eyebrow}</p>
          <h1 className="text-4xl font-semibold leading-tight tracking-tight sm:text-5xl">
            {article.title}
          </h1>
          <div className="flex flex-wrap items-center gap-2 text-xs font-medium uppercase tracking-[0.16em] text-muted">
            <span>{article.readingTime}</span>
            <span aria-hidden="true">•</span>
            <span>{t("hudLabel")}</span>
          </div>
          <p data-reading-anchor className="text-lg leading-8 text-muted">
            {article.intro}
          </p>
        </header>

        {article.sections.map((section, sectionIndex) => (
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
