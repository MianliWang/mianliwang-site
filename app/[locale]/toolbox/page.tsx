import { buttonClassName } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Link } from "@/i18n/navigation";
import type { AppLocale } from "@/i18n/routing";
import { cn } from "@/lib/cn";
import { parseCatalogItems } from "@/lib/content-catalog";
import { mergeCatalogItemsWithOverlay } from "@/lib/content";
import {
  ArrowRight,
  Braces,
  File,
  FileText,
  Languages,
  Wrench,
  type LucideIcon,
} from "lucide-react";
import { ToolboxWorkbench } from "@/components/toolbox/toolbox-workbench";
import { getTranslations } from "next-intl/server";

const TOOLBOX_ICON_BY_SLUG: Record<string, LucideIcon> = {
  base64: Braces,
  "text-utils": FileText,
  "text-translate": Languages,
  "pdf-translate": File,
};

type ToolboxPageProps = {
  params: Promise<{ locale: string }>;
};

function isAppLocale(value: string): value is AppLocale {
  return value === "en" || value === "zh";
}

export default async function ToolboxPage({ params }: ToolboxPageProps) {
  const { locale } = await params;
  const t = await getTranslations("Toolbox");
  const baseItems = parseCatalogItems(t.raw("items"));
  const items = isAppLocale(locale)
    ? await mergeCatalogItemsWithOverlay("toolbox", locale, baseItems)
    : baseItems;

  return (
    <section className="section-shell">
      <header className="section-header">
        <p className="t-eyebrow">{t("eyebrow")}</p>
        <h1 className="t-section-title text-[clamp(1.9rem,3.3vw,2.7rem)]">
          {t("title")}
        </h1>
        <p className="t-section-subtitle">{t("description")}</p>
      </header>

      {items.length > 0 ? (
        <div className="surface-bento-grid">
          {items.map((item, index) => {
            const Icon = TOOLBOX_ICON_BY_SLUG[item.slug] ?? Wrench;
            const order = String(index + 1).padStart(2, "0");
            const layout = index === 0 ? "feature" : "compact";
            const href = item.href ?? "/toolbox";

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
                    {t("openItem")}
                    <ArrowRight size={14} aria-hidden="true" className="ui-follow-icon" />
                  </Link>
                </div>
              </Card>
            );
          })}
        </div>
      ) : null}

      <ToolboxWorkbench />
    </section>
  );
}
