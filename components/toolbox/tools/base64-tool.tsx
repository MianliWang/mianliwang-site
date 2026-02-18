"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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

type TransformMode = "encode" | "decode";
type SourceType = "text" | "file";

function bytesToBase64(bytes: Uint8Array) {
  const chunkSize = 0x2000;
  let binary = "";
  for (let index = 0; index < bytes.length; index += chunkSize) {
    const chunk = bytes.subarray(index, index + chunkSize);
    binary += String.fromCharCode(...chunk);
  }
  return btoa(binary);
}

function base64ToBytes(value: string) {
  const compact = value.replace(/\s+/g, "");
  const padding = compact.length % 4;
  const normalized =
    padding === 0 ? compact : compact.padEnd(compact.length + (4 - padding), "=");
  const binary = atob(normalized);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return bytes;
}

function tryDecodeUtf8(bytes: Uint8Array) {
  try {
    return new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  } catch {
    return null;
  }
}

function buildDecodedFileName(fileName: string | null, defaultName: string) {
  if (!fileName) {
    return defaultName;
  }

  const stem = fileName.replace(/\.[^/.]+$/, "").trim();
  if (!stem) {
    return defaultName;
  }

  return `${stem}.bin`;
}

export function Base64Tool() {
  const t = useTranslations("Toolbox");
  const [mode, setMode] = useState<TransformMode>("encode");
  const [sourceType, setSourceType] = useState<SourceType>("text");
  const [textInput, setTextInput] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [output, setOutput] = useState("");
  const [error, setError] = useState("");
  const [downloadUrl, setDownloadUrl] = useState("");
  const [downloadName, setDownloadName] = useState("");
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

  const setDecodedDownload = (bytes: Uint8Array) => {
    clearDownload();
    const normalizedBuffer = bytes.buffer.slice(
      bytes.byteOffset,
      bytes.byteOffset + bytes.byteLength,
    ) as ArrayBuffer;
    const blob = new Blob([normalizedBuffer], {
      type: "application/octet-stream",
    });
    setDownloadUrl(URL.createObjectURL(blob));
    setDownloadName(
      buildDecodedFileName(selectedFile?.name ?? null, t("tools.base64.defaultDownload")),
    );
  };

  const readInputFromFile = async () => {
    if (!selectedFile) {
      throw new Error(t("tools.base64.errors.fileRequired"));
    }

    if (mode === "encode") {
      const buffer = await selectedFile.arrayBuffer();
      return new Uint8Array(buffer);
    }

    const fileText = await selectedFile.text();
    return base64ToBytes(fileText);
  };

  const readInputFromText = () => {
    if (!textInput.trim()) {
      throw new Error(t("tools.base64.errors.emptyInput"));
    }

    if (mode === "encode") {
      return new TextEncoder().encode(textInput);
    }

    return base64ToBytes(textInput);
  };

  const handleTransform = async () => {
    setError("");
    setCopied(false);

    try {
      const bytes =
        sourceType === "file" ? await readInputFromFile() : readInputFromText();

      if (mode === "encode") {
        clearDownload();
        setOutput(bytesToBase64(bytes));
        return;
      }

      const decodedText = tryDecodeUtf8(bytes);
      if (decodedText !== null) {
        setOutput(decodedText);
      } else {
        setOutput(t("tools.base64.binaryOutput", { bytes: bytes.length }));
      }
      setDecodedDownload(bytes);
    } catch (unknownError) {
      clearDownload();
      const fallbackMessage = t("tools.base64.errors.decodeInvalid");
      if (unknownError instanceof DOMException) {
        setError(fallbackMessage);
        return;
      }
      if (unknownError instanceof Error && unknownError.message) {
        setError(unknownError.message);
        return;
      }
      setError(fallbackMessage);
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
    setTextInput("");
    setSelectedFile(null);
    setOutput("");
    setError("");
    setCopied(false);
    clearDownload();
  };

  const handleModeChange = (nextMode: TransformMode) => {
    if (mode === nextMode) {
      return;
    }
    setMode(nextMode);
    setOutput("");
    setError("");
    setCopied(false);
    clearDownload();
  };

  return (
    <section className="toolbox-tool-shell">
      <header className="toolbox-tool-header">
        <p className="t-eyebrow">{t("categories.encoding")}</p>
        <h2 className="t-section-title">{t("tools.base64.title")}</h2>
        <p className="t-section-subtitle">{t("tools.base64.description")}</p>
      </header>

      <div className="toolbox-panel-grid">
        <div className="toolbox-pane ui-card">
          <div className="toolbox-pane-header">
            <p className="toolbox-pane-title">
              <FileInput size={13} aria-hidden="true" className="toolbox-pane-title-icon" />
              <span className="t-eyebrow">{t("common.input")}</span>
            </p>
          </div>

          <div className="toolbox-inline-groups">
            <div className="ui-toggle-group">
              {(["encode", "decode"] as const).map((item) => (
                <button
                  key={item}
                  type="button"
                  onClick={() => handleModeChange(item)}
                  className={cn(
                    "ui-toggle-item",
                    mode === item && "ui-toggle-item-active",
                  )}
                  aria-pressed={mode === item}
                >
                  {item === "encode"
                    ? t("tools.base64.modeEncode")
                    : t("tools.base64.modeDecode")}
                </button>
              ))}
            </div>

            <div className="ui-toggle-group">
              {(["text", "file"] as const).map((item) => (
                <button
                  key={item}
                  type="button"
                  onClick={() => setSourceType(item)}
                  className={cn(
                    "ui-toggle-item",
                    sourceType === item && "ui-toggle-item-active",
                  )}
                  aria-pressed={sourceType === item}
                >
                  {item === "text"
                    ? t("tools.base64.sourceText")
                    : t("tools.base64.sourceFile")}
                </button>
              ))}
            </div>
          </div>

          {sourceType === "text" ? (
            <Textarea
              value={textInput}
              onChange={(event) => setTextInput(event.target.value)}
              placeholder={t("tools.base64.inputPlaceholder")}
              spellCheck={false}
              className="min-h-44"
            />
          ) : (
            <div className="toolbox-file-input-wrap">
              <Input
                type="file"
                onChange={(event) =>
                  setSelectedFile(event.target.files?.[0] ?? null)
                }
                aria-label={t("tools.base64.sourceFile")}
              />
              <p className="toolbox-hint">
                {selectedFile
                  ? t("tools.base64.fileSelected", {
                      name: selectedFile.name,
                      bytes: selectedFile.size,
                    })
                  : t("tools.base64.fileHint")}
              </p>
            </div>
          )}

          <div className="toolbox-action-row">
            <Button variant="primary" type="button" onClick={handleTransform}>
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
            placeholder={t("tools.base64.outputPlaceholder")}
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
            {downloadUrl ? (
              <a
                href={downloadUrl}
                download={downloadName}
                className="ui-control ui-control-secondary"
              >
                {t("tools.base64.downloadDecoded")}
              </a>
            ) : null}
          </div>
        </div>
      </div>
    </section>
  );
}
