"use client";

import { usePathname, useRouter } from "@/i18n/navigation";
import type { AppLocale } from "@/i18n/routing";
import { cn } from "@/lib/cn";
import { Globe2 } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { useEffect, useRef, useTransition, type CSSProperties } from "react";

const LOCALE_SWITCHING_CLASS = "locale-switching";
const LOCALE_SWITCH_FALLBACK_MS = 520;

export function LanguageSwitcher() {
  const locale = useLocale() as AppLocale;
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const t = useTranslations("Controls");
  const [isPending, startTransition] = useTransition();
  const switchTimerRef = useRef<number | null>(null);
  const activeIndex = locale === "en" ? 0 : 1;

  useEffect(() => {
    const root = document.documentElement;
    if (root.classList.contains(LOCALE_SWITCHING_CLASS)) {
      window.requestAnimationFrame(() => {
        root.classList.remove(LOCALE_SWITCHING_CLASS);
      });
    }
  }, [locale, pathname]);

  useEffect(() => {
    return () => {
      if (switchTimerRef.current) {
        window.clearTimeout(switchTimerRef.current);
      }
      document.documentElement.classList.remove(LOCALE_SWITCHING_CLASS);
    };
  }, []);

  const changeLocale = (nextLocale: AppLocale) => {
    if (locale === nextLocale) {
      return;
    }

    const prefersReducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    if (!prefersReducedMotion) {
      const root = document.documentElement;
      root.classList.add(LOCALE_SWITCHING_CLASS);
      if (switchTimerRef.current) {
        window.clearTimeout(switchTimerRef.current);
      }
      switchTimerRef.current = window.setTimeout(() => {
        root.classList.remove(LOCALE_SWITCHING_CLASS);
      }, LOCALE_SWITCH_FALLBACK_MS);
    }

    const search = searchParams.toString();
    const hash = window.location.hash;
    const targetHref = `${pathname}${search ? `?${search}` : ""}${hash}`;

    startTransition(() => {
      router.replace(targetHref, { locale: nextLocale });
    });
  };

  return (
    <div className="ui-toggle-group" role="group" aria-label={t("language")}>
      <span className="px-1 text-muted" aria-hidden="true">
        <Globe2 size={13} className="ui-follow-icon" />
      </span>

      <div
        className="ui-segmented"
        style={{ "--segment-index": activeIndex } as CSSProperties}
      >
        <span className="ui-segmented-pill" />
        <button
          type="button"
          aria-pressed={locale === "en"}
          onClick={() => changeLocale("en")}
          disabled={isPending}
          className={cn(
            "ui-segmented-item",
            locale === "en" && "ui-segmented-item-active",
          )}
        >
          EN
        </button>
        <button
          type="button"
          aria-pressed={locale === "zh"}
          onClick={() => changeLocale("zh")}
          disabled={isPending}
          className={cn(
            "ui-segmented-item",
            locale === "zh" && "ui-segmented-item-active",
          )}
        >
          中文
        </button>
      </div>
    </div>
  );
}
