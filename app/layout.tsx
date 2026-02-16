import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

function resolveMetadataBase() {
  const fallback = "http://localhost:3000";
  const configuredUrl = process.env.NEXT_PUBLIC_SITE_URL ?? fallback;

  try {
    return new URL(configuredUrl);
  } catch {
    return new URL(fallback);
  }
}

export const metadata: Metadata = {
  metadataBase: resolveMetadataBase(),
  title: {
    default: "Mianli Wang",
    template: "%s | Mianli Wang",
  },
  description: "Personal site and practical toolbox by Mianli Wang.",
  openGraph: {
    title: "Mianli Wang",
    description: "Personal site and practical toolbox by Mianli Wang.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const initLocaleLangScript = `
    (() => {
      const segment = window.location.pathname.split("/")[1];
      if (segment === "en" || segment === "zh") {
        document.documentElement.lang = segment;
      }
    })();
  `;

  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: initLocaleLangScript }} />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} bg-background text-foreground antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
