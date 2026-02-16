"use client";

import { buttonClassName } from "@/components/ui/button";
import { MoonStar, SunMedium } from "lucide-react";
import { useTranslations } from "next-intl";
import { useTheme } from "next-themes";

export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  const t = useTranslations("Controls");

  if (!resolvedTheme) {
    return (
      <button type="button" disabled className={buttonClassName("secondary")}>
        {t("theme")}
      </button>
    );
  }

  const isDark = resolvedTheme === "dark";
  const nextTheme = isDark ? "light" : "dark";
  const label = isDark ? t("switchToLight") : t("switchToDark");

  return (
    <button
      type="button"
      onClick={() => setTheme(nextTheme)}
      aria-label={label}
      className={buttonClassName("secondary")}
    >
      {isDark ? <SunMedium size={13} aria-hidden="true" /> : <MoonStar size={13} aria-hidden="true" />}
      <span>{isDark ? t("darkShort") : t("lightShort")}</span>
    </button>
  );
}
