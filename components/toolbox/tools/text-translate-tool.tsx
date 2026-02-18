"use client";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Check,
  Clipboard,
  FileInput,
  FileOutput,
  LoaderCircle,
  RotateCcw,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useRef, useState } from "react";

type TranslateApiResponse = {
  ok?: boolean;
  translatedText?: unknown;
  error?: unknown;
};

export function TextTranslateTool() {
  const t = useTranslations("Toolbox");
  const [sourceText, setSourceText] = useState("");
  const [sourceLanguage, setSourceLanguage] = useState("auto");
  const [targetLanguage, setTargetLanguage] = useState("en");
  const [output, setOutput] = useState("");
  const [error, setError] = useState("");
  const [isWorking, setIsWorking] = useState(false);
  const [copied, setCopied] = useState(false);
  const copyTimerRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (copyTimerRef.current) {
        window.clearTimeout(copyTimerRef.current);
      }
    };
  }, []);

  const handleTranslate = async () => {
    setError("");
    setCopied(false);
    setIsWorking(true);

    try {
      if (!sourceText.trim()) {
        setError(t("tools.textTranslate.errors.emptyInput"));
        setOutput("");
        return;
      }

      const response = await fetch("/api/translate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          text: sourceText,
          sourceLang: sourceLanguage,
          targetLang: targetLanguage,
        }),
      });

      const payload = (await response.json().catch(() => null)) as
        | TranslateApiResponse
        | null;

      if (!response.ok || payload?.ok !== true) {
        const code = typeof payload?.error === "string" ? payload.error : "UNKNOWN";
        if (code === "RATE_LIMITED") {
          setError(t("tools.textTranslate.errors.rateLimited"));
        } else if (code === "OPENAI_NOT_CONFIGURED") {
          setError(t("tools.textTranslate.errors.serviceUnavailable"));
        } else {
          setError(t("tools.textTranslate.errors.generic"));
        }
        setOutput("");
        return;
      }

      if (typeof payload.translatedText !== "string") {
        setError(t("tools.textTranslate.errors.generic"));
        setOutput("");
        return;
      }

      setOutput(payload.translatedText);
    } catch {
      setError(t("tools.textTranslate.errors.generic"));
      setOutput("");
    } finally {
      setIsWorking(false);
    }
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
    setSourceText("");
    setOutput("");
    setError("");
    setCopied(false);
  };

  return (
    <section className="toolbox-tool-shell">
      <header className="toolbox-tool-header">
        <p className="t-eyebrow">{t("categories.document")}</p>
        <h2 className="t-section-title">{t("tools.textTranslate.title")}</h2>
        <p className="t-section-subtitle">{t("tools.textTranslate.description")}</p>
      </header>

      <div className="toolbox-panel-grid">
        <div className="toolbox-pane ui-card">
          <div className="toolbox-pane-header">
            <p className="toolbox-pane-title">
              <FileInput size={13} aria-hidden="true" className="toolbox-pane-title-icon" />
              <span className="t-eyebrow">{t("common.input")}</span>
            </p>
            <span className="toolbox-badge">{t("tools.textTranslate.apiBadge")}</span>
          </div>

          <div className="toolbox-select-grid">
            <label className="toolbox-select-field">
              <span>{t("tools.textTranslate.sourceLanguage")}</span>
              <select
                className="ui-field"
                value={sourceLanguage}
                onChange={(event) => setSourceLanguage(event.target.value)}
              >
                <option value="auto">{t("tools.textTranslate.languages.auto")}</option>
                <option value="zh">{t("tools.textTranslate.languages.zh")}</option>
                <option value="en">{t("tools.textTranslate.languages.en")}</option>
                <option value="ja">{t("tools.textTranslate.languages.ja")}</option>
              </select>
            </label>

            <label className="toolbox-select-field">
              <span>{t("tools.textTranslate.targetLanguage")}</span>
              <select
                className="ui-field"
                value={targetLanguage}
                onChange={(event) => setTargetLanguage(event.target.value)}
              >
                <option value="en">{t("tools.textTranslate.languages.en")}</option>
                <option value="zh">{t("tools.textTranslate.languages.zh")}</option>
                <option value="ja">{t("tools.textTranslate.languages.ja")}</option>
              </select>
            </label>
          </div>

          <Textarea
            value={sourceText}
            onChange={(event) => setSourceText(event.target.value)}
            placeholder={t("tools.textTranslate.inputPlaceholder")}
            className="min-h-36"
          />

          <div className="toolbox-action-row">
            <Button
              variant="primary"
              type="button"
              onClick={handleTranslate}
              disabled={isWorking}
            >
              {isWorking ? (
                <LoaderCircle size={14} aria-hidden="true" className="animate-spin" />
              ) : null}
              {isWorking ? t("tools.textTranslate.running") : t("common.run")}
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
            placeholder={t("tools.textTranslate.outputPlaceholder")}
            className="min-h-[27rem]"
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
