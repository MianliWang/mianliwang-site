import { getTranslations } from "next-intl/server";

export default async function ProjectsPage() {
  const t = await getTranslations("Projects");

  const items = [
    {
      title: t("itemOneTitle"),
      description: t("itemOneDescription"),
    },
    {
      title: t("itemTwoTitle"),
      description: t("itemTwoDescription"),
    },
  ];

  return (
    <section className="space-y-6">
      <h1 className="text-3xl font-semibold tracking-tight">{t("title")}</h1>
      <p className="max-w-2xl text-muted">{t("description")}</p>
      <div className="grid gap-4 md:grid-cols-2">
        {items.map((item) => (
          <article
            key={item.title}
            data-cursor-interactive="card"
            className="rounded-2xl border border-surface-border bg-surface p-5"
          >
            <h2 className="text-lg font-medium">{item.title}</h2>
            <p className="mt-2 text-sm text-muted">{item.description}</p>
          </article>
        ))}
      </div>
    </section>
  );
}
