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
  Orbit,
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

  const signals = [
    {
      title: t("signalOneTitle"),
      summary: t("signalOneSummary"),
      icon: Orbit,
    },
    {
      title: t("signalTwoTitle"),
      summary: t("signalTwoSummary"),
      icon: Gauge,
    },
    {
      title: t("signalThreeTitle"),
      summary: t("signalThreeSummary"),
      icon: Languages,
    },
  ] as const;

  return (
    <div className="page-stack">
      <section className="home-hero section-shell">
        <div className="section-header max-w-[var(--reading-max)]">
          <p className="t-eyebrow">{t("eyebrow")}</p>
          <h1 className="t-display">{t("title")}</h1>
          <p className="t-lead">{t("description")}</p>
        </div>

        <div className="home-hero-actions">
          <Link href="/projects" className={buttonClassName("primary")}>
            {t("primaryCta")}
            <ArrowRight size={14} aria-hidden="true" className="ui-follow-icon" />
          </Link>
          <Link href="/toolbox" className={buttonClassName("secondary")}>
            {t("secondaryCta")}
            <ArrowRight size={14} aria-hidden="true" className="ui-follow-icon" />
          </Link>
        </div>

        <ul className="home-signal-grid" aria-label={t("signalsLabel")}>
          {signals.map((signal) => {
            const Icon = signal.icon;

            return (
              <li key={signal.title} className="home-signal-card">
                <span className="home-signal-icon" aria-hidden="true">
                  <Icon size={14} />
                </span>
                <p className="home-signal-title">{signal.title}</p>
                <p className="home-signal-copy">{signal.summary}</p>
              </li>
            );
          })}
        </ul>
      </section>

      <section className="section-shell">
        <SectionHeader
          eyebrow={t("projectsEyebrow")}
          title={t("projectsTitle")}
          subtitle={t("projectsSubtitle")}
        />

        <div className="home-preview-grid md:grid-cols-2 xl:grid-cols-3">
          {projects.map((project) => {
            const Icon = project.icon;
            return (
              <Card
                key={project.title}
                as="article"
                interactive
                className="home-preview-card"
              >
                <div className="home-preview-icon">
                  <Icon size={17} aria-hidden="true" className="ui-follow-icon" />
                </div>
                <div className="grid gap-2">
                  <h3 className="t-card-title">{project.title}</h3>
                  <p className="t-card-copy">{project.summary}</p>
                  <p className="t-card-meta">{project.meta}</p>
                </div>
                <div>
                  <Link href={project.href} className={buttonClassName("ghost", "px-0")}>
                    {t("projectAction")}
                    <ArrowRight size={14} aria-hidden="true" className="ui-follow-icon" />
                  </Link>
                </div>
              </Card>
            );
          })}
        </div>
      </section>

      <section className="section-shell">
        <SectionHeader
          eyebrow={t("toolboxEyebrow")}
          title={t("toolboxTitle")}
          subtitle={t("toolboxSubtitle")}
        />

        <div className="home-preview-grid md:grid-cols-2 xl:grid-cols-3">
          {tools.map((tool) => {
            const Icon = tool.icon;
            return (
              <Card
                key={tool.title}
                as="article"
                interactive
                className="home-preview-card"
              >
                <div className="home-preview-icon">
                  <Icon size={17} aria-hidden="true" className="ui-follow-icon" />
                </div>
                <div className="grid gap-2">
                  <h3 className="t-card-title">{tool.title}</h3>
                  <p className="t-card-copy">{tool.summary}</p>
                </div>
                <div>
                  <Link href={tool.href} className={buttonClassName("ghost", "px-0")}>
                    {t("toolAction")}
                    <ArrowRight size={14} aria-hidden="true" className="ui-follow-icon" />
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
