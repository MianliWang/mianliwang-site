"use client";

import { usePathname, useRouter } from "@/i18n/navigation";
import type { AppLocale } from "@/i18n/routing";
import { cn } from "@/lib/cn";
import { Globe2 } from "lucide-react";
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
    <div className="ui-toggle-group" role="group" aria-label={t("language")}>
      <span className="px-1 text-muted" aria-hidden="true">
        <Globe2 size={13} />
      </span>
      <button
        type="button"
        onClick={() => changeLocale("en")}
        disabled={isPending}
        className={cn("ui-toggle-item", locale === "en" && "ui-toggle-item-active")}
      >
        EN
      </button>
      <button
        type="button"
        onClick={() => changeLocale("zh")}
        disabled={isPending}
        className={cn("ui-toggle-item", locale === "zh" && "ui-toggle-item-active")}
      >
        中文
      </button>
    </div>
  );
}
