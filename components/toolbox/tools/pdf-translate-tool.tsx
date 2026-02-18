"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Check,
  Clipboard,
  Download,
  FileInput,
  FileOutput,
  LoaderCircle,
  RotateCcw,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useRef, useState } from "react";

type PdfTranslateResponse = {
  ok?: boolean;
  error?: unknown;
  detail?: unknown;
};

type OutputMode = "translated" | "bilingual";

const MAX_PDF_BYTES = 25 * 1024 * 1024;

function parseDownloadFileName(contentDisposition: string | null) {
  if (!contentDisposition) {
    return null;
  }

  const utf8Match = contentDisposition.match(/filename\*=UTF-8''([^;]+)/i);
  if (utf8Match?.[1]) {
    try {
      return decodeURIComponent(utf8Match[1]);
    } catch {
      return utf8Match[1];
    }
  }

  const basicMatch = contentDisposition.match(/filename="?([^";]+)"?/i);
  return basicMatch?.[1] ?? null;
}

export function PdfTranslateTool() {
  const t = useTranslations("Toolbox");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [sourceLanguage, setSourceLanguage] = useState("auto");
  const [targetLanguage, setTargetLanguage] = useState("en");
  const [outputMode, setOutputMode] = useState<OutputMode>("bilingual");
  const [outputSummary, setOutputSummary] = useState("");
  const [downloadUrl, setDownloadUrl] = useState("");
  const [downloadName, setDownloadName] = useState("");
  const [error, setError] = useState("");
  const [isWorking, setIsWorking] = useState(false);
  const [copied, setCopied] = useState(false);
  const copyTimerRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (copyTimerRef.current) {
        window.clearTimeout(copyTimerRef.current);
      }
      if (downloadUrl) {
        URL.revokeObjectURL(downloadUrl);
      }
    };
  }, [downloadUrl]);

  const clearDownload = () => {
    if (downloadUrl) {
      URL.revokeObjectURL(downloadUrl);
    }
    setDownloadUrl("");
    setDownloadName("");
  };

  const handleTranslate = async () => {
    setError("");
    setCopied(false);
    setIsWorking(true);

    try {
      if (!selectedFile) {
        setError(t("tools.pdfTranslate.errors.fileRequired"));
        setOutputSummary("");
        return;
      }

      if (!selectedFile.name.toLowerCase().endsWith(".pdf")) {
        setError(t("tools.pdfTranslate.errors.fileType"));
        setOutputSummary("");
        return;
      }

      if (selectedFile.size > MAX_PDF_BYTES) {
        setError(t("tools.pdfTranslate.errors.fileTooLarge"));
        setOutputSummary("");
        return;
      }

      const formData = new FormData();
      formData.append("file", selectedFile);
      formData.append("source_lang", sourceLanguage);
      formData.append("target_lang", targetLanguage);
      formData.append("output_mode", outputMode);

      const response = await fetch("/api/translate/pdf", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as
          | PdfTranslateResponse
          | null;
        const code = typeof payload?.error === "string" ? payload.error : "UNKNOWN";

        if (code === "RATE_LIMITED") {
          setError(t("tools.pdfTranslate.errors.rateLimited"));
        } else if (
          code === "PDF_TRANSLATE_SERVICE_UNAVAILABLE" ||
          code === "PDF_TRANSLATE_NOT_CONFIGURED"
        ) {
          setError(t("tools.pdfTranslate.errors.serviceUnavailable"));
        } else if (code === "FILE_TOO_LARGE") {
          setError(t("tools.pdfTranslate.errors.fileTooLarge"));
        } else if (code === "UNSUPPORTED_FILE_TYPE") {
          setError(t("tools.pdfTranslate.errors.fileType"));
        } else {
          setError(t("tools.pdfTranslate.errors.generic"));
        }
        setOutputSummary("");
        clearDownload();
        return;
      }

      const contentType = response.headers.get("content-type") ?? "";
      if (!contentType.toLowerCase().includes("application/pdf")) {
        setError(t("tools.pdfTranslate.errors.generic"));
        setOutputSummary("");
        clearDownload();
        return;
      }

      const pdfBytes = await response.arrayBuffer();
      const fileBlob = new Blob([pdfBytes], { type: "application/pdf" });
      const url = URL.createObjectURL(fileBlob);
      const upstreamName = parseDownloadFileName(
        response.headers.get("content-disposition"),
      );
      const fallbackName = `${selectedFile.name.replace(/\.pdf$/i, "")}.${outputMode}.pdf`;

      clearDownload();
      setDownloadUrl(url);
      setDownloadName(upstreamName ?? fallbackName);
      setOutputSummary(
        t("tools.pdfTranslate.outputSummary", {
          fileName: upstreamName ?? fallbackName,
          bytes: fileBlob.size,
          mode:
            outputMode === "bilingual"
              ? t("tools.pdfTranslate.outputMode.bilingual")
              : t("tools.pdfTranslate.outputMode.translated"),
        }),
      );
    } catch {
      setError(t("tools.pdfTranslate.errors.generic"));
      setOutputSummary("");
      clearDownload();
    } finally {
      setIsWorking(false);
    }
  };

  const handleCopy = async () => {
    if (!outputSummary) {
      return;
    }

    try {
      await navigator.clipboard.writeText(outputSummary);
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
    setSelectedFile(null);
    setOutputSummary("");
    setError("");
    setCopied(false);
    clearDownload();
  };

  return (
    <section className="toolbox-tool-shell">
      <header className="toolbox-tool-header">
        <p className="t-eyebrow">{t("categories.document")}</p>
        <h2 className="t-section-title">{t("tools.pdfTranslate.title")}</h2>
        <p className="t-section-subtitle">{t("tools.pdfTranslate.description")}</p>
      </header>

      <div className="toolbox-panel-grid">
        <div className="toolbox-pane ui-card">
          <div className="toolbox-pane-header">
            <p className="toolbox-pane-title">
              <FileInput size={13} aria-hidden="true" className="toolbox-pane-title-icon" />
              <span className="t-eyebrow">{t("common.input")}</span>
            </p>
            <span className="toolbox-badge">{t("tools.pdfTranslate.apiBadge")}</span>
          </div>

          <div className="toolbox-select-grid">
            <label className="toolbox-select-field">
              <span>{t("tools.pdfTranslate.sourceLanguage")}</span>
              <select
                className="ui-field"
                value={sourceLanguage}
                onChange={(event) => setSourceLanguage(event.target.value)}
              >
                <option value="auto">{t("tools.pdfTranslate.languages.auto")}</option>
                <option value="zh">{t("tools.pdfTranslate.languages.zh")}</option>
                <option value="en">{t("tools.pdfTranslate.languages.en")}</option>
                <option value="ja">{t("tools.pdfTranslate.languages.ja")}</option>
              </select>
            </label>

            <label className="toolbox-select-field">
              <span>{t("tools.pdfTranslate.targetLanguage")}</span>
              <select
                className="ui-field"
                value={targetLanguage}
                onChange={(event) => setTargetLanguage(event.target.value)}
              >
                <option value="en">{t("tools.pdfTranslate.languages.en")}</option>
                <option value="zh">{t("tools.pdfTranslate.languages.zh")}</option>
                <option value="ja">{t("tools.pdfTranslate.languages.ja")}</option>
              </select>
            </label>
          </div>

          <label className="toolbox-select-field">
            <span>{t("tools.pdfTranslate.outputModeLabel")}</span>
            <select
              className="ui-field"
              value={outputMode}
              onChange={(event) => setOutputMode(event.target.value as OutputMode)}
            >
              <option value="bilingual">
                {t("tools.pdfTranslate.outputMode.bilingual")}
              </option>
              <option value="translated">
                {t("tools.pdfTranslate.outputMode.translated")}
              </option>
            </select>
          </label>

          <div className="toolbox-file-input-wrap">
            <Input
              type="file"
              accept=".pdf,application/pdf"
              onChange={(event) => setSelectedFile(event.target.files?.[0] ?? null)}
              aria-label={t("tools.pdfTranslate.fileLabel")}
            />
            <p className="toolbox-hint">
              {selectedFile
                ? t("tools.pdfTranslate.fileSelected", {
                    name: selectedFile.name,
                    bytes: selectedFile.size,
                  })
                : t("tools.pdfTranslate.fileHint")}
            </p>
          </div>

          <div className="toolbox-action-row">
            <Button variant="primary" type="button" onClick={handleTranslate} disabled={isWorking}>
              {isWorking ? (
                <LoaderCircle size={14} aria-hidden="true" className="animate-spin" />
              ) : null}
              {isWorking ? t("tools.pdfTranslate.running") : t("common.run")}
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
            value={outputSummary}
            readOnly
            placeholder={t("tools.pdfTranslate.outputPlaceholder")}
            className="min-h-44"
          />

          <div className="toolbox-action-row">
            <Button
              variant="secondary"
              type="button"
              onClick={handleCopy}
              disabled={!outputSummary}
            >
              {copied ? (
                <Check size={14} aria-hidden="true" className="ui-follow-icon" />
              ) : (
                <Clipboard size={14} aria-hidden="true" className="ui-follow-icon" />
              )}
              {copied ? t("common.copied") : t("common.copy")}
            </Button>
            {downloadUrl ? (
              <a href={downloadUrl} download={downloadName} className="ui-control ui-control-primary">
                <Download size={14} aria-hidden="true" className="ui-follow-icon" />
                {t("tools.pdfTranslate.download")}
              </a>
            ) : null}
          </div>
        </div>
      </div>
    </section>
  );
}
