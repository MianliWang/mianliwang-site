"use client";

import { usePathname, useRouter } from "@/i18n/navigation";
import type { AppLocale } from "@/i18n/routing";
import { useLocale, useTranslations } from "next-intl";
import { useTransition } from "react";

export function LanguageSwitcher() {
  const locale = useLocale() as AppLocale;
  const pathname = usePathname();
  const router = useRouter();
  const t = useTranslations("Controls");
  const [isPending, startTransition] = useTransition();

  const changeLocale = (nextLocale: AppLocale) => {
    if (locale === nextLocale) {
      return;
    }

    document.cookie = `NEXT_LOCALE=${nextLocale}; path=/; max-age=31536000; samesite=lax`;
    startTransition(() => {
      router.replace(pathname, { locale: nextLocale });
    });
  };

  return (
    <div
      className="inline-flex rounded-full border border-surface-border bg-surface p-1"
      role="group"
      aria-label={t("language")}
    >
      <button
        type="button"
        onClick={() => changeLocale("en")}
        disabled={isPending}
        className={`rounded-full px-3 py-1 text-xs font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus ${
          locale === "en" ? "bg-accent text-background" : "text-muted"
        }`}
      >
        EN
      </button>
      <button
        type="button"
        onClick={() => changeLocale("zh")}
        disabled={isPending}
        className={`rounded-full px-3 py-1 text-xs font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus ${
          locale === "zh" ? "bg-accent text-background" : "text-muted"
        }`}
      >
        中文
      </button>
    </div>
  );
}
