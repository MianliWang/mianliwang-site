import { buttonClassName } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { SectionHeader } from "@/components/ui/section-header";
import { Link } from "@/i18n/navigation";
import {
  ArrowRight,
  Braces,
  FileText,
  FolderKanban,
  Gauge,
  Languages,
  ShieldCheck,
} from "lucide-react";
import { getTranslations } from "next-intl/server";

export default async function HomePage() {
  const t = await getTranslations("Home");

  const projects = [
    {
      title: t("projectOneTitle"),
      summary: t("projectOneSummary"),
      meta: t("projectOneMeta"),
      icon: FolderKanban,
      href: "/projects",
    },
    {
      title: t("projectTwoTitle"),
      summary: t("projectTwoSummary"),
      meta: t("projectTwoMeta"),
      icon: Gauge,
      href: "/projects",
    },
    {
      title: t("projectThreeTitle"),
      summary: t("projectThreeSummary"),
      meta: t("projectThreeMeta"),
      icon: ShieldCheck,
      href: "/ama",
    },
  ] as const;

  const tools = [
    {
      title: t("toolOneTitle"),
      summary: t("toolOneSummary"),
      icon: Braces,
      href: "/toolbox",
    },
    {
      title: t("toolTwoTitle"),
      summary: t("toolTwoSummary"),
      icon: FileText,
      href: "/toolbox",
    },
    {
      title: t("toolThreeTitle"),
      summary: t("toolThreeSummary"),
      icon: Languages,
      href: "/toolbox",
    },
  ] as const;

  return (
    <div className="page-stack">
      <section className="grid gap-8 pt-4">
        <div className="section-header">
          <p className="t-eyebrow">{t("eyebrow")}</p>
          <h1 className="t-display">{t("title")}</h1>
          <p className="t-lead">{t("description")}</p>
        </div>

        <div className="flex flex-wrap gap-3">
          <Link href="/projects" className={buttonClassName("primary")}>
            {t("primaryCta")}
            <ArrowRight size={14} aria-hidden="true" />
          </Link>
          <Link href="/toolbox" className={buttonClassName("secondary")}>
            {t("secondaryCta")}
            <ArrowRight size={14} aria-hidden="true" />
          </Link>
        </div>
      </section>

      <section className="grid gap-6">
        <SectionHeader
          eyebrow={t("projectsEyebrow")}
          title={t("projectsTitle")}
          subtitle={t("projectsSubtitle")}
        />

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {projects.map((project) => {
            const Icon = project.icon;
            return (
              <Card
                key={project.title}
                as="article"
                interactive
                className="grid gap-4 p-5"
              >
                <div className="inline-flex h-10 w-10 items-center justify-center rounded-[var(--radius-soft)] border border-surface-border bg-surface-2 text-accent">
                  <Icon size={17} aria-hidden="true" />
                </div>
                <div className="grid gap-2">
                  <h3 className="text-[1.03rem] font-semibold leading-snug tracking-tight">
                    {project.title}
                  </h3>
                  <p className="text-sm leading-7 text-muted">{project.summary}</p>
                  <p className="text-[0.73rem] font-medium uppercase tracking-[0.16em] text-muted">
                    {project.meta}
                  </p>
                </div>
                <div>
                  <Link href={project.href} className={buttonClassName("ghost", "px-0")}>
                    {t("primaryCta")}
                    <ArrowRight size={14} aria-hidden="true" />
                  </Link>
                </div>
              </Card>
            );
          })}
        </div>
      </section>

      <section className="grid gap-6">
        <SectionHeader
          eyebrow={t("toolboxEyebrow")}
          title={t("toolboxTitle")}
          subtitle={t("toolboxSubtitle")}
        />

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {tools.map((tool) => {
            const Icon = tool.icon;
            return (
              <Card
                key={tool.title}
                as="article"
                interactive
                className="grid gap-4 p-5"
              >
                <div className="inline-flex h-10 w-10 items-center justify-center rounded-[var(--radius-soft)] border border-surface-border bg-surface-2 text-accent">
                  <Icon size={17} aria-hidden="true" />
                </div>
                <div className="grid gap-2">
                  <h3 className="text-[1.03rem] font-semibold leading-snug tracking-tight">
                    {tool.title}
                  </h3>
                  <p className="text-sm leading-7 text-muted">{tool.summary}</p>
                </div>
                <div>
                  <Link href={tool.href} className={buttonClassName("ghost", "px-0")}>
                    {t("toolAction")}
                    <ArrowRight size={14} aria-hidden="true" />
                  </Link>
                </div>
              </Card>
            );
          })}
        </div>
      </section>
    </div>
  );
}
