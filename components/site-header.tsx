"use client";

import { buttonClassName } from "@/components/ui/button";
import { Link, usePathname } from "@/i18n/navigation";
import { cn } from "@/lib/cn";
import {
  BookOpen,
  Globe2,
  House,
  MessageCircle,
  FolderKanban,
  Wrench,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { Suspense, type CSSProperties } from "react";
import { LanguageSwitcher } from "./language-switcher";
import { ThemeToggle } from "./theme-toggle";

function LanguageSwitcherFallback() {
  return (
    <div className="ui-toggle-group" aria-hidden="true">
      <span className="px-1 text-muted">
        <Globe2 size={13} className="ui-follow-icon" />
      </span>
      <div
        className="ui-segmented"
        style={{ "--segment-index": 0 } as CSSProperties}
      >
        <span className="ui-segmented-pill" />
        <span className="ui-segmented-item ui-segmented-item-active">EN</span>
        <span className="ui-segmented-item">中文</span>
      </div>
    </div>
  );
}

export function SiteHeader() {
  const t = useTranslations("Nav");
  const pathname = usePathname();

  const navItems = [
    { href: "/", label: t("home"), icon: House },
    { href: "/projects", label: t("projects"), icon: FolderKanban },
    { href: "/writing", label: t("reading"), icon: BookOpen },
    { href: "/toolbox", label: t("toolbox"), icon: Wrench },
    { href: "/ama", label: t("ama"), icon: MessageCircle },
  ] as const;

  return (
    <header className="site-header sticky top-0 z-30 border-b border-surface-border/70 bg-background/78 backdrop-blur-xl">
      <div className="mx-auto flex w-full max-w-[var(--content-max)] flex-wrap items-center justify-between gap-3 px-[var(--container-inline)] py-4">
        <Link href="/" className="inline-flex items-baseline gap-2">
          <span className="text-[0.74rem] font-semibold uppercase tracking-[0.22em] text-muted">
            MW
          </span>
          <span className="text-[0.98rem] font-semibold tracking-tight">
            Mianli Wang
          </span>
        </Link>

        <nav className="flex flex-wrap items-center gap-1.5" aria-label={t("mainNav")}>
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive =
              pathname === item.href ||
              (item.href !== "/" && pathname.startsWith(item.href));

            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  buttonClassName("ghost"),
                  "h-9 px-3 text-[0.76rem]",
                  isActive &&
                    "border-accent/35 bg-surface-2 text-accent shadow-[0_4px_12px_rgb(0_0_0/0.06)]",
                  !isActive && "text-muted",
                )}
              >
                <Icon size={14} aria-hidden="true" className="ui-follow-icon" />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="flex items-center gap-2">
          <Suspense fallback={<LanguageSwitcherFallback />}>
            <LanguageSwitcher />
          </Suspense>
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
