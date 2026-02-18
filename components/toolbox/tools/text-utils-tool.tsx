"use client";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/cn";
import {
  Check,
  Clipboard,
  FileInput,
  FileOutput,
  RotateCcw,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useRef, useState } from "react";

type CaseMode = "none" | "upper" | "lower" | "title";

function normalizeWhitespace(value: string) {
  return value
    .replace(/[^\S\r\n]+/g, " ")
    .replace(/\r\n/g, "\n")
    .replace(/[ \t]*\n[ \t]*/g, "\n")
    .replace(/\n{3,}/g, "\n\n");
}

function toTitleCase(value: string) {
  return value.toLowerCase().replace(/\b([a-z])([a-z]*)/g, (_, first, rest) => {
    return `${String(first).toUpperCase()}${String(rest)}`;
  });
}

export function TextUtilsTool() {
  const t = useTranslations("Toolbox");
  const [input, setInput] = useState("");
  const [output, setOutput] = useState("");
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
  const [trimEnabled, setTrimEnabled] = useState(true);
  const [normalizeEnabled, setNormalizeEnabled] = useState(true);
  const [jsonPretty, setJsonPretty] = useState(false);
  const [caseMode, setCaseMode] = useState<CaseMode>("none");
  const copyTimerRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (copyTimerRef.current) {
        window.clearTimeout(copyTimerRef.current);
      }
    };
  }, []);

  const applyTransform = () => {
    if (!input.trim()) {
      setError(t("tools.text.errors.emptyInput"));
      setOutput("");
      return;
    }

    setError("");
    let nextValue = input;

    if (trimEnabled) {
      nextValue = nextValue.trim();
    }

    if (normalizeEnabled) {
      nextValue = normalizeWhitespace(nextValue);
    }

    if (caseMode === "upper") {
      nextValue = nextValue.toUpperCase();
    } else if (caseMode === "lower") {
      nextValue = nextValue.toLowerCase();
    } else if (caseMode === "title") {
      nextValue = toTitleCase(nextValue);
    }

    if (jsonPretty) {
      try {
        const parsed = JSON.parse(nextValue);
        nextValue = JSON.stringify(parsed, null, 2);
      } catch {
        setError(t("tools.text.errors.invalidJson"));
        setOutput("");
        return;
      }
    }

    setOutput(nextValue);
  };

  const handleCopy = async () => {
    if (!output) {
      return;
    }

    try {
      await navigator.clipboard.writeText(output);
      setCopied(true);
      if (copyTimerRef.current) {
        window.clearTimeout(copyTimerRef.current);
      }
      copyTimerRef.current = window.setTimeout(() => {
        setCopied(false);
      }, 1200);
    } catch {
      setError(t("common.copyFailed"));
    }
  };

  const handleClear = () => {
    setInput("");
    setOutput("");
    setError("");
    setCopied(false);
  };

  return (
    <section className="toolbox-tool-shell">
      <header className="toolbox-tool-header">
        <p className="t-eyebrow">{t("categories.text")}</p>
        <h2 className="t-section-title">{t("tools.text.title")}</h2>
        <p className="t-section-subtitle">{t("tools.text.description")}</p>
      </header>

      <div className="toolbox-panel-grid">
        <div className="toolbox-pane ui-card">
          <div className="toolbox-pane-header">
            <p className="toolbox-pane-title">
              <FileInput size={13} aria-hidden="true" className="toolbox-pane-title-icon" />
              <span className="t-eyebrow">{t("common.input")}</span>
            </p>
          </div>

          <Textarea
            value={input}
            onChange={(event) => setInput(event.target.value)}
            placeholder={t("tools.text.inputPlaceholder")}
            spellCheck={false}
            className="min-h-44"
          />

          <div className="toolbox-option-list">
            <label className="toolbox-option-item">
              <input
                type="checkbox"
                checked={trimEnabled}
                onChange={(event) => setTrimEnabled(event.target.checked)}
              />
              <span>{t("tools.text.options.trim")}</span>
            </label>

            <label className="toolbox-option-item">
              <input
                type="checkbox"
                checked={normalizeEnabled}
                onChange={(event) => setNormalizeEnabled(event.target.checked)}
              />
              <span>{t("tools.text.options.normalizeWhitespace")}</span>
            </label>

            <label className="toolbox-option-item">
              <input
                type="checkbox"
                checked={jsonPretty}
                onChange={(event) => setJsonPretty(event.target.checked)}
              />
              <span>{t("tools.text.options.jsonPretty")}</span>
            </label>
          </div>

          <div className="ui-toggle-group">
            {(["none", "upper", "lower", "title"] as const).map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => setCaseMode(item)}
                className={cn("ui-toggle-item", caseMode === item && "ui-toggle-item-active")}
                aria-pressed={caseMode === item}
              >
                {item === "none"
                  ? t("tools.text.case.none")
                  : item === "upper"
                    ? t("tools.text.case.upper")
                    : item === "lower"
                      ? t("tools.text.case.lower")
                      : t("tools.text.case.title")}
              </button>
            ))}
          </div>

          <div className="toolbox-action-row">
            <Button variant="primary" type="button" onClick={applyTransform}>
              {t("common.run")}
            </Button>
            <Button variant="secondary" type="button" onClick={handleClear}>
              <RotateCcw size={14} aria-hidden="true" className="ui-follow-icon" />
              {t("common.clear")}
            </Button>
          </div>

          {error ? <p className="toolbox-error">{error}</p> : null}
        </div>

        <div className="toolbox-pane ui-card">
          <div className="toolbox-pane-header">
            <p className="toolbox-pane-title">
              <FileOutput size={13} aria-hidden="true" className="toolbox-pane-title-icon" />
              <span className="t-eyebrow">{t("common.output")}</span>
            </p>
          </div>

          <Textarea
            value={output}
            readOnly
            placeholder={t("tools.text.outputPlaceholder")}
            className="min-h-44"
          />

          <div className="toolbox-action-row">
            <Button
              variant="secondary"
              type="button"
              onClick={handleCopy}
              disabled={!output}
            >
              {copied ? (
                <Check size={14} aria-hidden="true" className="ui-follow-icon" />
              ) : (
                <Clipboard size={14} aria-hidden="true" className="ui-follow-icon" />
              )}
              {copied ? t("common.copied") : t("common.copy")}
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}
