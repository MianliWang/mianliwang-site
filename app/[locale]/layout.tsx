import { Providers } from "@/components/providers";
import { SiteHeader } from "@/components/site-header";
import { Cursor } from "@/components/motion/Cursor";
import { DevFeatureFlagsPanel } from "@/components/motion/DevFeatureFlagsPanel";
import { MotionProvider } from "@/components/motion/MotionProvider";
import { Spotlight } from "@/components/motion/Spotlight";
import { routing } from "@/i18n/routing";
import { hasLocale, NextIntlClientProvider } from "next-intl";
import {
  getMessages,
  getTranslations,
  setRequestLocale,
} from "next-intl/server";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";

type LocaleLayoutProps = {
  children: ReactNode;
  params: Promise<{ locale: string }>;
};

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export default async function LocaleLayout({
  children,
  params,
}: LocaleLayoutProps) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) {
    notFound();
  }

  setRequestLocale(locale);

  const messages = await getMessages();
  const t = await getTranslations("Accessibility");

  return (
    <NextIntlClientProvider messages={messages}>
      <Providers>
        <MotionProvider>
          <Spotlight />
          <Cursor />
          <DevFeatureFlagsPanel />
          <a
            href="#main-content"
            className="sr-only z-50 rounded-md bg-surface px-4 py-2 text-sm font-medium focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
          >
            {t("skipToContent")}
          </a>
          <div className="min-h-screen">
            <SiteHeader />
            <main
              id="main-content"
              className="mx-auto w-full max-w-5xl px-4 pb-16 pt-10 sm:px-6 lg:px-8"
            >
              {children}
            </main>
          </div>
        </MotionProvider>
      </Providers>
    </NextIntlClientProvider>
  );
}
