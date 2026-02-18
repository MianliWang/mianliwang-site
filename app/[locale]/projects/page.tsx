import { buttonClassName } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { SectionHeader } from "@/components/ui/section-header";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/cn";
import { ArrowRight, FolderKanban, Wrench } from "lucide-react";
import { getTranslations } from "next-intl/server";

export default async function ProjectsPage() {
  const t = await getTranslations("Projects");
  const nav = await getTranslations("Nav");

  const items = [
    {
      title: t("itemOneTitle"),
      description: t("itemOneDescription"),
      icon: FolderKanban,
      href: "/writing",
      actionLabel: nav("reading"),
      order: "01",
      layout: "feature",
    },
    {
      title: t("itemTwoTitle"),
      description: t("itemTwoDescription"),
      icon: Wrench,
      href: "/toolbox",
      actionLabel: nav("toolbox"),
      order: "02",
      layout: "compact",
    },
  ] as const;

  return (
    <section className="section-shell">
      <SectionHeader title={t("title")} subtitle={t("description")} />

      <div className="surface-bento-grid surface-bento-grid-projects">
        {items.map((item) => {
          const Icon = item.icon;

          return (
            <Card
              key={item.title}
              as="article"
              interactive
              data-cursor-interactive="card"
              className={cn(
                "surface-bento-card",
                item.layout === "feature" && "surface-bento-card-feature",
                item.layout === "compact" && "surface-bento-card-compact",
              )}
            >
              <div className="surface-bento-head">
                <span className="surface-bento-icon" aria-hidden="true">
                  <Icon size={17} className="ui-follow-icon" />
                </span>
                <span className="surface-bento-index">{item.order}</span>
              </div>

              <div className="surface-bento-copy">
                <h2 className="t-card-title">{item.title}</h2>
                <p className="t-card-copy">{item.description}</p>
              </div>

              <div className="surface-bento-footer">
                <Link href={item.href} className={buttonClassName("ghost", "px-0")}>
                  {item.actionLabel}
                  <ArrowRight size={14} aria-hidden="true" className="ui-follow-icon" />
                </Link>
              </div>
            </Card>
          );
        })}
      </div>
    </section>
  );
}
