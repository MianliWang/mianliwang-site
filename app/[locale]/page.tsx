import { Link } from "@/i18n/navigation";
import { getTranslations } from "next-intl/server";

export default async function HomePage() {
  const t = await getTranslations("Home");

  return (
    <section className="space-y-6">
      <p className="text-sm uppercase tracking-[0.2em] text-muted">
        {t("eyebrow")}
      </p>
      <h1 className="max-w-3xl text-4xl font-semibold leading-tight tracking-tight sm:text-5xl">
        {t("title")}
      </h1>
      <p className="max-w-2xl text-lg leading-relaxed text-muted">
        {t("description")}
      </p>

      <div className="flex flex-wrap gap-3 pt-2">
        <Link
          href="/projects"
          className="rounded-full bg-accent px-5 py-2.5 text-sm font-medium text-background"
        >
          {t("primaryCta")}
        </Link>
        <Link
          href="/toolbox"
          className="rounded-full border border-surface-border px-5 py-2.5 text-sm font-medium"
        >
          {t("secondaryCta")}
        </Link>
      </div>
    </section>
  );
}
