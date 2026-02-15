import { getTranslations } from "next-intl/server";

export default async function ToolboxPage() {
  const t = await getTranslations("Toolbox");

  const cards = [
    {
      title: t("base64Title"),
      description: t("base64Description"),
    },
    {
      title: t("textTitle"),
      description: t("textDescription"),
    },
    {
      title: t("docTitle"),
      description: t("docDescription"),
    },
  ];

  return (
    <section className="space-y-6">
      <h1 className="text-3xl font-semibold tracking-tight">{t("title")}</h1>
      <p className="max-w-2xl text-muted">{t("description")}</p>
      <div className="grid gap-4 md:grid-cols-3">
        {cards.map((card) => (
          <article
            key={card.title}
            data-cursor-interactive="card"
            className="rounded-2xl border border-surface-border bg-surface p-5"
          >
            <h2 className="text-lg font-medium">{card.title}</h2>
            <p className="mt-2 text-sm text-muted">{card.description}</p>
            <p className="mt-4 text-xs uppercase tracking-wide text-muted">
              {t("comingSoon")}
            </p>
          </article>
        ))}
      </div>
    </section>
  );
}
