import { Card } from "@/components/ui/card";
import { buttonClassName } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";
import { ArrowRight, Braces, FileText, Languages } from "lucide-react";
import { getTranslations } from "next-intl/server";

export default async function ToolboxPage() {
  const t = await getTranslations("Toolbox");

  const cards = [
    {
      id: "base64",
      title: t("base64Title"),
      description: t("base64Description"),
      guide: t("base64Guide"),
      icon: Braces,
    },
    {
      id: "text-utils",
      title: t("textTitle"),
      description: t("textDescription"),
      guide: t("textGuide"),
      icon: FileText,
    },
    {
      id: "doc-translate",
      title: t("docTitle"),
      description: t("docDescription"),
      guide: t("docGuide"),
      icon: Languages,
    },
  ] as const;

  return (
    <section className="space-y-6">
      <h1 className="text-3xl font-semibold tracking-tight">{t("title")}</h1>
      <p className="max-w-2xl text-muted">{t("description")}</p>
      <div className="grid gap-4 md:grid-cols-3">
        {cards.map((card) => {
          const Icon = card.icon;
          return (
            <Card
              key={card.id}
              id={card.id}
              as="article"
              interactive
              data-cursor-interactive="card"
              className="group grid gap-4 p-5"
            >
              <div className="flex items-start gap-3">
                <div className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-[var(--radius-soft)] border border-surface-border bg-surface-2 text-accent">
                  <Icon size={17} aria-hidden="true" className="ui-follow-icon" />
                </div>
                <div className="grid gap-2">
                  <p className="t-eyebrow text-[0.63rem]">{t("entryLabel")}</p>
                  <h2 className="text-lg font-semibold tracking-tight">{card.title}</h2>
                  <p className="text-sm leading-7 text-muted">{card.description}</p>
                </div>
              </div>

              <div className="flex items-center justify-between border-t border-surface-border/70 pt-3">
                <p className="text-xs font-medium uppercase tracking-[0.15em] text-muted">
                  {card.guide}
                </p>
                <Link
                  href={`/toolbox#${card.id}`}
                  className={buttonClassName("ghost", "h-8 px-2.5 text-xs")}
                >
                  {t("openEntry")}
                  <ArrowRight size={13} aria-hidden="true" className="ui-follow-icon" />
                </Link>
              </div>
            </Card>
          );
        })}
      </div>
    </section>
  );
}
