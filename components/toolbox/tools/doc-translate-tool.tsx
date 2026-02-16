"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Check, Clipboard, LoaderCircle, RotateCcw } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useRef, useState } from "react";

type TranslateApiResponse = {
  ok?: boolean;
  translatedText?: unknown;
  error?: unknown;
};

export function DocTranslateTool() {
  const t = useTranslations("Toolbox");
  const [sourceText, setSourceText] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
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

  const resolveSource = async () => {
    if (sourceText.trim()) {
      return sourceText;
    }

    if (!selectedFile) {
      throw new Error(t("tools.doc.errors.emptyInput"));
    }

    if (selectedFile.size > 2 * 1024 * 1024) {
      throw new Error(t("tools.doc.errors.fileTooLarge"));
    }

    const text = await selectedFile.text();
    if (!text.trim()) {
      throw new Error(t("tools.doc.errors.emptyInput"));
    }

    return text;
  };

  const handleTranslate = async () => {
    setError("");
    setCopied(false);
    setIsWorking(true);

    try {
      const source = await resolveSource();
      const response = await fetch("/api/translate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          text: source,
          sourceLang: sourceLanguage,
          targetLang: targetLanguage,
        }),
      });

      const payload = (await response.json()) as TranslateApiResponse;
      if (!response.ok || payload.ok !== true) {
        const code = typeof payload.error === "string" ? payload.error : "UNKNOWN";

        if (code === "RATE_LIMITED") {
          setError(t("tools.doc.errors.rateLimited"));
        } else if (code === "OPENAI_NOT_CONFIGURED") {
          setError(t("tools.doc.errors.serviceUnavailable"));
        } else {
          setError(t("tools.doc.errors.generic"));
        }
        setOutput("");
        return;
      }

      if (typeof payload.translatedText !== "string") {
        setError(t("tools.doc.errors.generic"));
        setOutput("");
        return;
      }

      setOutput(payload.translatedText);
    } catch (unknownError) {
      if (unknownError instanceof Error && unknownError.message) {
        setError(unknownError.message);
      } else {
        setError(t("tools.doc.errors.generic"));
      }
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
    setSelectedFile(null);
    setOutput("");
    setError("");
    setCopied(false);
  };

  return (
    <section className="toolbox-tool-shell">
      <header className="toolbox-tool-header">
        <p className="t-eyebrow">{t("categories.document")}</p>
        <h2 className="t-section-title">{t("tools.doc.title")}</h2>
        <p className="t-section-subtitle">{t("tools.doc.description")}</p>
      </header>

      <div className="toolbox-panel-grid">
        <div className="toolbox-pane ui-card">
          <div className="toolbox-pane-header">
            <p className="t-eyebrow">{t("common.input")}</p>
            <span className="toolbox-badge">{t("tools.doc.apiBadge")}</span>
          </div>

          <div className="toolbox-select-grid">
            <label className="toolbox-select-field">
              <span>{t("tools.doc.sourceLanguage")}</span>
              <select
                className="ui-field"
                value={sourceLanguage}
                onChange={(event) => setSourceLanguage(event.target.value)}
              >
                <option value="auto">{t("tools.doc.languages.auto")}</option>
                <option value="zh">{t("tools.doc.languages.zh")}</option>
                <option value="en">{t("tools.doc.languages.en")}</option>
                <option value="ja">{t("tools.doc.languages.ja")}</option>
              </select>
            </label>

            <label className="toolbox-select-field">
              <span>{t("tools.doc.targetLanguage")}</span>
              <select
                className="ui-field"
                value={targetLanguage}
                onChange={(event) => setTargetLanguage(event.target.value)}
              >
                <option value="en">{t("tools.doc.languages.en")}</option>
                <option value="zh">{t("tools.doc.languages.zh")}</option>
                <option value="ja">{t("tools.doc.languages.ja")}</option>
              </select>
            </label>

          </div>

          <Textarea
            value={sourceText}
            onChange={(event) => setSourceText(event.target.value)}
            placeholder={t("tools.doc.inputPlaceholder")}
            className="min-h-36"
          />

          <div className="toolbox-file-input-wrap">
            <Input
              type="file"
              onChange={(event) => setSelectedFile(event.target.files?.[0] ?? null)}
              aria-label={t("tools.doc.fileLabel")}
            />
            <p className="toolbox-hint">
              {selectedFile
                ? t("tools.doc.fileSelected", {
                    name: selectedFile.name,
                    bytes: selectedFile.size,
                  })
                : t("tools.doc.fileHint")}
            </p>
          </div>

          <div className="toolbox-action-row">
            <Button
              variant="primary"
              type="button"
              onClick={handleTranslate}
              disabled={isWorking || !targetLanguage || !sourceLanguage}
            >
              {isWorking ? (
                <LoaderCircle size={14} aria-hidden="true" className="animate-spin" />
              ) : null}
              {isWorking ? t("tools.doc.running") : t("common.run")}
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
            <p className="t-eyebrow">{t("common.output")}</p>
          </div>

          <Textarea
            value={output}
            readOnly
            placeholder={t("tools.doc.outputPlaceholder")}
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
