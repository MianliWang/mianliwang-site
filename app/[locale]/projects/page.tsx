import { buttonClassName } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { SectionHeader } from "@/components/ui/section-header";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/cn";
import { parseCatalogItems } from "@/lib/content-catalog";
import {
  ArrowRight,
  FolderKanban,
  Gauge,
  MessageCircle,
  Wrench,
  type LucideIcon,
} from "lucide-react";
import { getTranslations } from "next-intl/server";

const PROJECT_ICON_BY_SLUG: Record<string, LucideIcon> = {
  "personal-site-system": FolderKanban,
  "motion-runtime-architecture": Gauge,
  "ama-minimal-product": MessageCircle,
  "toolbox-foundations": Wrench,
};

function resolveActionLabel(
  href: string | undefined,
  nav: (key: "toolbox" | "ama" | "reading" | "projects") => string,
  fallback: string,
) {
  if (!href) {
    return fallback;
  }

  if (href.startsWith("/toolbox")) {
    return nav("toolbox");
  }

  if (href.startsWith("/ama")) {
    return nav("ama");
  }

  if (href.startsWith("/writing") || href.startsWith("/reading")) {
    return nav("reading");
  }

  if (href.startsWith("/projects")) {
    return nav("projects");
  }

  return fallback;
}

export default async function ProjectsPage() {
  const t = await getTranslations("Projects");
  const nav = await getTranslations("Nav");
  const items = parseCatalogItems(t.raw("items"));

  return (
    <section className="section-shell">
      <SectionHeader title={t("title")} subtitle={t("description")} />

      <div className="surface-bento-grid surface-bento-grid-projects">
        {items.map((item, index) => {
          const Icon = PROJECT_ICON_BY_SLUG[item.slug] ?? FolderKanban;
          const order = String(index + 1).padStart(2, "0");
          const layout = index === 0 ? "feature" : "compact";
          const actionLabel = resolveActionLabel(item.href, nav, t("openItem"));
          const href = item.href ?? "/projects";

          return (
            <Card
              key={item.slug}
              as="article"
              interactive
              data-cursor-interactive="card"
              className={cn(
                "surface-bento-card",
                layout === "feature" && "surface-bento-card-feature",
                layout === "compact" && "surface-bento-card-compact",
              )}
            >
              <div className="surface-bento-head">
                <span className="surface-bento-icon" aria-hidden="true">
                  <Icon size={17} className="ui-follow-icon" />
                </span>
                <span className="surface-bento-index">{order}</span>
              </div>

              <div className="surface-bento-copy">
                <h2 className="t-card-title">{item.title}</h2>
                <p className="t-card-copy">{item.summary}</p>
                {item.tags.length > 0 ? (
                  <p className="surface-bento-meta">{item.tags.slice(0, 3).join(" · ")}</p>
                ) : null}
              </div>

              <div className="surface-bento-footer">
                <Link href={href} className={buttonClassName("ghost", "px-0")}>
                  {actionLabel}
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
