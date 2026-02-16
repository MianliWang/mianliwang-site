"use client";

import { buttonClassName } from "@/components/ui/button";
import { MoonStar, SunMedium } from "lucide-react";
import { useTranslations } from "next-intl";
import { useTheme } from "next-themes";
import { useEffect, useRef } from "react";

export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  const t = useTranslations("Controls");
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) {
        window.clearTimeout(timerRef.current);
      }
      document.documentElement.classList.remove("theme-transitioning");
    };
  }, []);

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
  const handleToggle = () => {
    const prefersReducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;

    if (!prefersReducedMotion) {
      const root = document.documentElement;
      root.classList.add("theme-transitioning");
      if (timerRef.current) {
        window.clearTimeout(timerRef.current);
      }
      timerRef.current = window.setTimeout(() => {
        root.classList.remove("theme-transitioning");
      }, 320);
    }

    setTheme(nextTheme);
  };

  return (
    <button
      type="button"
      onClick={handleToggle}
      aria-label={label}
      className={buttonClassName("secondary")}
    >
      {isDark ? (
        <SunMedium size={13} aria-hidden="true" className="ui-follow-icon" />
      ) : (
        <MoonStar size={13} aria-hidden="true" className="ui-follow-icon" />
      )}
      <span>{isDark ? t("darkShort") : t("lightShort")}</span>
    </button>
  );
}
