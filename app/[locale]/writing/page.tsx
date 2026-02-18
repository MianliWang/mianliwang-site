import { buttonClassName } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Link } from "@/i18n/navigation";
import type { AppLocale } from "@/i18n/routing";
import { listWritingArticlesFromContent } from "@/lib/content";
import { parseWritingArticles } from "@/lib/writing";
import { ArrowRight, NotebookText } from "lucide-react";
import { getTranslations } from "next-intl/server";

type WritingIndexPageProps = {
  params: Promise<{ locale: string }>;
};

function isAppLocale(value: string): value is AppLocale {
  return value === "en" || value === "zh";
}

function mergeArticles(
  messageArticles: ReturnType<typeof parseWritingArticles>,
  contentArticles: Awaited<ReturnType<typeof listWritingArticlesFromContent>>,
) {
  const map = new Map<string, (typeof messageArticles)[number]>();
  for (const article of messageArticles) {
    map.set(article.slug, article);
  }

  for (const article of contentArticles) {
    map.set(article.slug, article);
  }

  return Array.from(map.values());
}

export default async function WritingIndexPage({ params }: WritingIndexPageProps) {
  const { locale } = await params;
  const t = await getTranslations("Writing");
  const messageArticles = parseWritingArticles(t.raw("articles"));
  const contentArticles = isAppLocale(locale)
    ? await listWritingArticlesFromContent(locale)
    : [];
  const articles = mergeArticles(messageArticles, contentArticles);

  return (
    <section className="space-y-8">
      <header className="section-header">
        <p className="t-eyebrow">{t("eyebrow")}</p>
        <h1 className="t-section-title text-[clamp(1.9rem,3vw,2.7rem)]">
          {t("title")}
        </h1>
        <p className="t-section-subtitle">{t("description")}</p>
      </header>

      <div className="grid gap-4 md:grid-cols-2">
        {articles.map((article) => (
          <Card
            key={article.slug}
            as="article"
            interactive
            data-cursor-interactive="card"
            className="group grid gap-4 p-5"
          >
            <div className="flex items-start gap-3">
              <div className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-[var(--radius-soft)] border border-surface-border bg-surface-2 text-accent">
                <NotebookText size={17} aria-hidden="true" className="ui-follow-icon" />
              </div>
              <div className="space-y-2">
                <p className="t-eyebrow text-[0.64rem]">{article.eyebrow}</p>
                <h2 className="text-[1.08rem] font-semibold leading-snug tracking-tight">
                  {article.title}
                </h2>
                <p className="text-sm leading-7 text-muted">{article.summary}</p>
              </div>
            </div>

            <div className="flex items-center justify-between border-t border-surface-border/70 pt-3">
              <p className="text-xs font-medium uppercase tracking-[0.16em] text-muted">
                {article.readingTime}
              </p>
              <Link
                href={`/writing/${article.slug}`}
                className={buttonClassName("ghost", "h-8 px-2.5 text-xs")}
              >
                {t("openArticle")}
                <ArrowRight size={13} aria-hidden="true" className="ui-follow-icon" />
              </Link>
            </div>
          </Card>
        ))}
      </div>
    </section>
  );
}
