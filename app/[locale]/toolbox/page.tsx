import { ToolboxWorkbench } from "@/components/toolbox/toolbox-workbench";
import { getTranslations } from "next-intl/server";

export default async function ToolboxPage() {
  const t = await getTranslations("Toolbox");

  return (
    <section className="section-shell">
      <header className="section-header">
        <p className="t-eyebrow">{t("eyebrow")}</p>
        <h1 className="t-section-title text-[clamp(1.9rem,3.3vw,2.7rem)]">
          {t("title")}
        </h1>
        <p className="t-section-subtitle">{t("description")}</p>
      </header>

      <ToolboxWorkbench />
    </section>
  );
}
