"use client";

import { useTranslations } from "next-intl";
import { useTheme } from "next-themes";

export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  const t = useTranslations("Controls");

  if (!resolvedTheme) {
    return (
      <button
        type="button"
        disabled
        className="rounded-full border border-surface-border px-3 py-1.5 text-xs text-muted"
      >
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
      className="rounded-full border border-surface-border bg-surface px-3 py-1.5 text-xs font-medium transition-colors hover:border-accent hover:text-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
    >
      {isDark ? t("darkShort") : t("lightShort")}
    </button>
  );
}
