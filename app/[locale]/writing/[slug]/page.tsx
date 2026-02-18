import { ReadingHUD } from "@/components/motion/ReadingHUD";
import { routing } from "@/i18n/routing";
import type { AppLocale } from "@/i18n/routing";
import {
  getWritingArticleFromContent,
  listWritingSlugsFromContent,
} from "@/lib/content";
import { parseWritingArticles } from "@/lib/writing";
import enMessages from "@/messages/en.json";
import zhMessages from "@/messages/zh.json";
import { getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";
import type { ReactElement } from "react";

type WritingArticlePageProps = {
  params: Promise<{ locale: string; slug: string }>;
};

type RichBlock =
  | { kind: "subheading"; text: string }
  | { kind: "paragraph"; text: string }
  | { kind: "quote"; text: string; cite: string }
  | { kind: "list"; ordered: boolean; items: string[] }
  | { kind: "code"; language: string; code: string };

type RichSection = {
  title: string;
  blocks: RichBlock[];
};

const interactionRhythmAppendix: Record<"en" | "zh", RichSection[]> = {
  en: [
    {
      title: "Execution Rhythm: from structure to nuance",
      blocks: [
        {
          kind: "subheading",
          text: "Lock hierarchy before decoration",
        },
        {
          kind: "paragraph",
          text: "Start with readable rhythm: intro, section signal, then detail. If this order is unstable, no animation can rescue comprehension.",
        },
        {
          kind: "list",
          ordered: false,
          items: [
            "Define one primary heading and one secondary heading cadence.",
            "Reserve accent color for active or focus states only.",
            "Use repeated card structure to reduce decision cost while scanning.",
          ],
        },
        {
          kind: "paragraph",
          text: "A stable sequence helps users predict where meaning lives. This predictability is what makes a portfolio feel crafted, not crowded.",
        },
        {
          kind: "subheading",
          text: "Treat motion as explanation",
        },
        {
          kind: "quote",
          text: "Good motion doesn't add excitement first. It removes ambiguity first.",
          cite: "Interaction note",
        },
        {
          kind: "paragraph",
          text: "Small delays between label and icon movement communicate priority. Text settles first, icon confirms intent second.",
        },
        {
          kind: "code",
          language: "css",
          code: `:root {\n  --motion-duration-fast: 220ms;\n  --motion-ease-spring: cubic-bezier(0.22, 1, 0.36, 1);\n  --motion-delay-follow: 54ms;\n}\n\n.ui-follow-icon {\n  transition: transform var(--motion-duration-fast)\n    var(--motion-ease-spring) var(--motion-delay-follow);\n}`,
        },
      ],
    },
    {
      title: "Reading HUD trigger details and fallback",
      blocks: [
        {
          kind: "subheading",
          text: "Use IntersectionObserver as the primary trigger",
        },
        {
          kind: "paragraph",
          text: "The active marker should react to meaningful visibility windows, not every scroll event. This keeps the main thread cleaner and the signal calmer.",
        },
        {
          kind: "list",
          ordered: true,
          items: [
            "Observe paragraph anchors only (not every decorative node).",
            "Score candidates by distance to a reading focus line.",
            "Move the marker with light interpolation; avoid theatrical spring.",
          ],
        },
        {
          kind: "code",
          language: "ts",
          code: `const observer = new IntersectionObserver(callback, {\n  root: null,\n  rootMargin: "-16% 0px -62% 0px",\n  threshold: [0, 0.15, 0.35, 0.55, 0.8, 1],\n});`,
        },
        {
          kind: "paragraph",
          text: "When reduced motion is enabled, movement should become discrete updates. State stays visible, but travel animation disappears.",
        },
        {
          kind: "quote",
          text: "Reduced motion is not less design. It is clearer design under a stricter contract.",
          cite: "Accessibility principle",
        },
      ],
    },
  ],
  zh: [
    {
      title: "实施节奏：从结构到细节",
      blocks: [
        {
          kind: "subheading",
          text: "先锁定信息层级，再讨论装饰",
        },
        {
          kind: "paragraph",
          text: "先把阅读节奏排稳：引言、分节信号、细节展开。如果这个顺序不稳，任何动画都无法真正提升理解效率。",
        },
        {
          kind: "list",
          ordered: false,
          items: [
            "固定主标题与次级标题的出现节奏。",
            "强调色只给 active / focus，不给所有元素。",
            "卡片结构重复使用，降低扫读与比较成本。",
          ],
        },
        {
          kind: "paragraph",
          text: "当结构可预测时，用户会更快定位信息。所谓“质感”，很多时候来自这种稳定的可预期性。",
        },
        {
          kind: "subheading",
          text: "把动效当作解释器，而不是装饰器",
        },
        {
          kind: "quote",
          text: "好的动效先消除歧义，再表达风格。",
          cite: "交互笔记",
        },
        {
          kind: "paragraph",
          text: "标签先稳定、图标后跟随的轻微延迟，能自然表达层级关系，避免所有元素同时抢注意力。",
        },
        {
          kind: "code",
          language: "css",
          code: `:root {\n  --motion-duration-fast: 220ms;\n  --motion-ease-spring: cubic-bezier(0.22, 1, 0.36, 1);\n  --motion-delay-follow: 54ms;\n}\n\n.ui-follow-icon {\n  transition: transform var(--motion-duration-fast)\n    var(--motion-ease-spring) var(--motion-delay-follow);\n}`,
        },
      ],
    },
    {
      title: "阅读 HUD 触发细节与回退策略",
      blocks: [
        {
          kind: "subheading",
          text: "用 IntersectionObserver 做主触发",
        },
        {
          kind: "paragraph",
          text: "引导点不应跟着每个滚动事件抖动，而应在“进入阅读窗口”的段落之间做稳定切换，保证主线程负担可控。",
        },
        {
          kind: "list",
          ordered: true,
          items: [
            "只观察正文锚点，不观察装饰节点。",
            "按段落到阅读焦点线的距离做评分。",
            "点位移动用轻插值，不做夸张弹簧。",
          ],
        },
        {
          kind: "code",
          language: "ts",
          code: `const observer = new IntersectionObserver(callback, {\n  root: null,\n  rootMargin: "-16% 0px -62% 0px",\n  threshold: [0, 0.15, 0.35, 0.55, 0.8, 1],\n});`,
        },
        {
          kind: "paragraph",
          text: "当用户开启 reduced motion，移动应退化为离散跳转。状态表达还在，但连续追随动画应被移除。",
        },
        {
          kind: "quote",
          text: "reduced-motion 不是降级，而是更严格的清晰度协议。",
          cite: "可访问性原则",
        },
      ],
    },
  ],
};

function getAppendixSections(locale: string, slug: string): RichSection[] {
  if (slug !== "interaction-rhythm") {
    return [];
  }

  return locale === "zh"
    ? interactionRhythmAppendix.zh
    : interactionRhythmAppendix.en;
}

function renderRichBlock(block: RichBlock, key: string): ReactElement {
  if (block.kind === "subheading") {
    return (
      <h3 key={key} className="pt-2 text-[1.18rem] font-semibold tracking-tight">
        {block.text}
      </h3>
    );
  }

  if (block.kind === "paragraph") {
    return (
      <p key={key} data-reading-anchor className="text-lg leading-8 text-muted">
        {block.text}
      </p>
    );
  }

  if (block.kind === "quote") {
    return (
      <blockquote
        key={key}
        data-reading-anchor
        className="rounded-[var(--radius-soft)] border-l-2 border-accent/45 bg-surface/55 px-4 py-3 text-[0.98rem] leading-8 text-foreground/90"
      >
        <p>{block.text}</p>
        <cite className="mt-2 block text-[0.72rem] font-medium uppercase tracking-[0.14em] text-muted">
          {block.cite}
        </cite>
      </blockquote>
    );
  }

  if (block.kind === "list") {
    const ListTag = block.ordered ? "ol" : "ul";
    const listClassName = block.ordered
      ? "ml-5 list-decimal space-y-2 text-[0.98rem] leading-8 text-muted"
      : "ml-5 list-disc space-y-2 text-[0.98rem] leading-8 text-muted";

    return (
      <ListTag key={key} data-reading-anchor className={listClassName}>
        {block.items.map((item, index) => (
          <li key={`${key}-item-${index}`}>{item}</li>
        ))}
      </ListTag>
    );
  }

  return (
    <pre
      key={key}
      data-reading-anchor
      className="overflow-x-auto rounded-[var(--radius-soft)] border border-surface-border/75 bg-surface/65 p-4"
    >
      <code className="font-mono text-[0.78rem] leading-6 text-foreground">
        {block.code}
      </code>
    </pre>
  );
}

const writingMessagesByLocale = {
  en: enMessages.Writing?.articles,
  zh: zhMessages.Writing?.articles,
} as const;

function isAppLocale(value: string): value is AppLocale {
  return value === "en" || value === "zh";
}

export async function generateStaticParams() {
  const byLocale = await Promise.all(
    routing.locales.map(async (locale) => {
      const messageSlugs = parseWritingArticles(writingMessagesByLocale[locale]).map(
        (entry) => entry.slug,
      );
      const contentSlugs = await listWritingSlugsFromContent(locale);
      const mergedSlugs = new Set([...messageSlugs, ...contentSlugs]);

      return [...mergedSlugs].map((slug) => ({
        locale,
        slug,
      }));
    }),
  );

  return byLocale.flat();
}

export default async function WritingArticlePage({
  params,
}: WritingArticlePageProps) {
  const { slug, locale } = await params;
  const t = await getTranslations("Writing");
  const messageArticle = parseWritingArticles(t.raw("articles")).find(
    (entry) => entry.slug === slug,
  );
  const contentArticle = isAppLocale(locale)
    ? await getWritingArticleFromContent(locale, slug)
    : null;
  const article = contentArticle ?? messageArticle;

  if (!article) {
    notFound();
  }

  const articleId = `writing-article-${article.slug}`;
  const appendixSections =
    contentArticle === null ? getAppendixSections(locale, article.slug) : [];

  return (
    <section className="writing-page-shell">
      <ReadingHUD scopeId={articleId} />

      <article
        id={articleId}
        className="writing-article-pad mx-auto max-w-3xl space-y-12 pb-10"
      >
        <header className="space-y-5">
          <p className="t-eyebrow">{article.eyebrow}</p>
          <h1 className="text-4xl font-semibold leading-tight tracking-tight sm:text-5xl">
            {article.title}
          </h1>
          <div className="flex flex-wrap items-center gap-2 text-xs font-medium uppercase tracking-[0.16em] text-muted">
            <span>{article.readingTime}</span>
            <span aria-hidden="true">•</span>
            <span>{t("hudLabel")}</span>
          </div>
          <p data-reading-anchor className="text-lg leading-8 text-muted">
            {article.intro}
          </p>
        </header>

        {article.sections.map((section, sectionIndex) => (
          <section key={section.title} className="space-y-5">
            <h2 className="text-2xl font-semibold tracking-tight">{section.title}</h2>
            {section.paragraphs.map((paragraph, paragraphIndex) => (
              <p
                key={`${sectionIndex}-${paragraphIndex}`}
                data-reading-anchor
                className="text-lg leading-8 text-muted"
              >
                {paragraph}
              </p>
            ))}
          </section>
        ))}

        {appendixSections.map((section, sectionIndex) => (
          <section key={`appendix-${section.title}`} className="space-y-5">
            <h2 className="text-2xl font-semibold tracking-tight">{section.title}</h2>
            {section.blocks.map((block, blockIndex) =>
              renderRichBlock(block, `appendix-${sectionIndex}-${blockIndex}`),
            )}
          </section>
        ))}
      </article>
    </section>
  );
}
