import { AmaForm } from "@/components/ama-form";
import { getTranslations } from "next-intl/server";

export default async function AmaPage() {
  const t = await getTranslations("AMA");

  return (
    <section className="space-y-6">
      <h1 className="text-3xl font-semibold tracking-tight">{t("title")}</h1>
      <p className="max-w-2xl text-muted">{t("description")}</p>
      <AmaForm />
    </section>
  );
}
