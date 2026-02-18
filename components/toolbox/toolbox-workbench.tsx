"use client";

import { Input } from "@/components/ui/input";
import { buttonClassName } from "@/components/ui/button";
import { cn } from "@/lib/cn";
import {
  Binary,
  FileText,
  Languages,
  Search,
  Sparkles,
  type LucideIcon,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { useMemo, useState } from "react";
import { TOOLBOX_TOOLS } from "./tool-registry";
import type { ToolboxCategoryId, ToolboxToolId } from "./types";

const TOOL_TEXT_KEY: Record<
  ToolboxToolId,
  "base64" | "text" | "textTranslate" | "pdfTranslate"
> = {
  base64: "base64",
  "text-utils": "text",
  "text-translate": "textTranslate",
  "pdf-translate": "pdfTranslate",
};

const CATEGORY_ORDER: ToolboxCategoryId[] = ["encoding", "text", "document"];
const CATEGORY_ICONS: Record<ToolboxCategoryId, LucideIcon> = {
  encoding: Binary,
  text: FileText,
  document: Languages,
};

export function ToolboxWorkbench() {
  const t = useTranslations("Toolbox");
  const [search, setSearch] = useState("");
  const [activeToolId, setActiveToolId] = useState<ToolboxToolId>(TOOLBOX_TOOLS[0].id);

  const filteredTools = useMemo(() => {
    const keyword = search.trim().toLowerCase();
    if (!keyword) {
      return TOOLBOX_TOOLS;
    }

    return TOOLBOX_TOOLS.filter((tool) => {
      const toolKey = TOOL_TEXT_KEY[tool.id];
      const corpus = [
        t(`tools.${toolKey}.title`),
        t(`tools.${toolKey}.description`),
        t(`tools.${toolKey}.tags`),
        t(`categories.${tool.category}`),
      ]
        .join(" ")
        .toLowerCase();

      return corpus.includes(keyword);
    });
  }, [search, t]);

  const groupedTools = useMemo(() => {
    return CATEGORY_ORDER.map((category) => ({
      category,
      tools: filteredTools.filter((tool) => tool.category === category),
    })).filter((group) => group.tools.length > 0);
  }, [filteredTools]);

  const activeTool =
    TOOLBOX_TOOLS.find((tool) => tool.id === activeToolId) ??
    filteredTools[0] ??
    TOOLBOX_TOOLS[0];
  const ActiveToolPanel = activeTool.component;

  return (
    <div className="toolbox-workbench">
      <aside className="toolbox-sidebar ui-card">
        <header className="toolbox-sidebar-header">
          <p className="t-eyebrow">{t("workspaceEyebrow")}</p>
          <div className="toolbox-sidebar-title-row">
            <span className="toolbox-sidebar-title-icon-wrap" aria-hidden="true">
              <Sparkles size={14} className="ui-follow-icon" />
            </span>
            <h2 className="toolbox-sidebar-title">{t("workspaceTitle")}</h2>
          </div>
          <p className="toolbox-sidebar-copy">{t("workspaceDescription")}</p>
        </header>

        <label className="toolbox-search-wrap">
          <Search size={13} aria-hidden="true" className="toolbox-search-icon" />
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder={t("searchPlaceholder")}
            className="toolbox-search-input h-9 text-sm"
            aria-label={t("searchPlaceholder")}
          />
        </label>

        <div className="toolbox-nav-groups">
          {groupedTools.length === 0 ? (
            <p className="toolbox-empty">{t("emptySearch")}</p>
          ) : (
            groupedTools.map((group) => {
              const CategoryIcon = CATEGORY_ICONS[group.category];

              return (
                <section key={group.category} className="toolbox-nav-group">
                  <p className="toolbox-nav-category">
                    <span className="toolbox-nav-category-icon" aria-hidden="true">
                      <CategoryIcon size={12} className="ui-follow-icon" />
                    </span>
                    <span>{t(`categories.${group.category}`)}</span>
                  </p>
                  <ul className="toolbox-nav-list">
                    {group.tools.map((tool) => {
                      const isActive = tool.id === activeToolId;
                      const Icon = tool.icon;
                      const toolKey = TOOL_TEXT_KEY[tool.id];

                      return (
                        <li key={tool.id}>
                          <button
                            type="button"
                            onClick={() => setActiveToolId(tool.id)}
                            className={cn(
                              buttonClassName("ghost", "toolbox-nav-item"),
                              isActive && "toolbox-nav-item-active",
                            )}
                            data-active={isActive ? "true" : "false"}
                          >
                            <span className="toolbox-nav-icon" aria-hidden="true">
                              <Icon size={14} className="ui-follow-icon" />
                            </span>
                            <span className="toolbox-nav-text">
                              <span className="toolbox-nav-title">
                                {t(`tools.${toolKey}.title`)}
                              </span>
                              <span className="toolbox-nav-desc">
                                {t(`tools.${toolKey}.navHint`)}
                              </span>
                            </span>
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                </section>
              );
            })
          )}
        </div>
      </aside>

      <div className="toolbox-main-panel">
        <ActiveToolPanel />
      </div>
    </div>
  );
}
