"use client";

import { Link, usePathname } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { LanguageSwitcher } from "./language-switcher";
import { ThemeToggle } from "./theme-toggle";

export function SiteHeader() {
  const t = useTranslations("Nav");
  const pathname = usePathname();

  const navItems = [
    { href: "/", label: t("home") },
    { href: "/projects", label: t("projects") },
    { href: "/reading", label: t("reading") },
    { href: "/toolbox", label: t("toolbox") },
    { href: "/ama", label: t("ama") },
  ] as const;

  return (
    <header className="sticky top-0 z-30 border-b border-surface-border/80 bg-background/90 backdrop-blur-sm">
      <div className="mx-auto flex w-full max-w-5xl flex-wrap items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-8">
        <Link href="/" className="text-base font-semibold tracking-tight">
          Mianli Wang
        </Link>
        <nav className="flex items-center gap-1" aria-label={t("mainNav")}>
          {navItems.map((item) => {
            const isActive = pathname === item.href;

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`rounded-full px-3 py-1.5 text-sm transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus ${
                  isActive
                    ? "bg-surface text-foreground"
                    : "text-muted hover:text-foreground"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="flex items-center gap-2">
          <LanguageSwitcher />
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
