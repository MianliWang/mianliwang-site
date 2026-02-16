"use client";

import {
  AMA_EMAIL_MAX_LENGTH,
  AMA_MESSAGE_MAX_LENGTH,
  AMA_NAME_MAX_LENGTH,
  type AmaMessage,
} from "@/lib/ama/types";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useTranslations } from "next-intl";
import { FormEvent, useCallback, useEffect, useState } from "react";

type SubmitState = "idle" | "submitting" | "success" | "error";

type AmaListResponse = {
  items: AmaMessage[];
};

type AmaCreateResponse = {
  ok: boolean;
  item?: AmaMessage;
  error?: string;
};

function formatCreatedAt(timestamp: string) {
  const parsed = new Date(timestamp);
  if (Number.isNaN(parsed.getTime())) {
    return timestamp;
  }

  return parsed.toLocaleString();
}

export function AmaForm() {
  const t = useTranslations("AMA");
  const [submitState, setSubmitState] = useState<SubmitState>("idle");
  const [feedback, setFeedback] = useState("");
  const [items, setItems] = useState<AmaMessage[]>([]);
  const [isListLoading, setIsListLoading] = useState(true);
  const [listError, setListError] = useState("");

  const loadItems = useCallback(async () => {
    setIsListLoading(true);
    setListError("");

    try {
      const response = await fetch("/api/ama", { cache: "no-store" });
      if (!response.ok) {
        throw new Error("Load failed");
      }

      const data = (await response.json()) as AmaListResponse;
      setItems(Array.isArray(data.items) ? data.items : []);
    } catch {
      setListError(t("listLoadError"));
    } finally {
      setIsListLoading(false);
    }
  }, [t]);

  useEffect(() => {
    void loadItems();
  }, [loadItems]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(form);
    const payload = {
      name: String(formData.get("name") ?? ""),
      email: String(formData.get("email") ?? ""),
      message: String(formData.get("message") ?? ""),
    };

    setSubmitState("submitting");
    setFeedback("");

    try {
      const response = await fetch("/api/ama", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const data = (await response.json()) as AmaCreateResponse;
      if (!response.ok || !data.ok || !data.item) {
        if (data.error === "RATE_LIMITED") {
          setFeedback(t("rateLimited"));
        } else {
          setFeedback(t("error"));
        }
        setSubmitState("error");
        return;
      }

      setSubmitState("success");
      setFeedback(t("success"));
      setItems((previous) => [data.item as AmaMessage, ...previous]);
      form.reset();
    } catch {
      setSubmitState("error");
      setFeedback(t("error"));
    }
  };

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Card
        as="form"
        onSubmit={handleSubmit}
        className="space-y-4 p-6"
      >
        <label className="block space-y-2 text-sm">
          <span className="text-muted">{t("nameLabel")}</span>
          <Input
            type="text"
            name="name"
            required
            maxLength={AMA_NAME_MAX_LENGTH}
          />
        </label>

        <label className="block space-y-2 text-sm">
          <span className="text-muted">{t("emailLabel")}</span>
          <Input
            type="email"
            name="email"
            required
            maxLength={AMA_EMAIL_MAX_LENGTH}
          />
        </label>

        <label className="block space-y-2 text-sm">
          <span className="text-muted">{t("messageLabel")}</span>
          <Textarea
            name="message"
            required
            rows={6}
            maxLength={AMA_MESSAGE_MAX_LENGTH}
          />
        </label>

        <Button
          type="submit"
          variant="primary"
          disabled={submitState === "submitting"}
          className="min-w-[8.5rem]"
        >
          {submitState === "submitting" ? t("sending") : t("submit")}
        </Button>

        <p className="text-sm text-muted" aria-live="polite">
          {feedback}
        </p>
      </Card>

      <Card as="section" className="p-6">
        <header className="mb-4 flex items-center justify-between gap-2">
          <h2 className="text-lg font-semibold">{t("listTitle")}</h2>
          <Button
            type="button"
            variant="ghost"
            onClick={() => void loadItems()}
            className="h-8 px-3 text-xs"
          >
            {t("refresh")}
          </Button>
        </header>

        {isListLoading ? <p className="text-sm text-muted">{t("listLoading")}</p> : null}
        {!isListLoading && listError ? (
          <p className="text-sm text-muted">{listError}</p>
        ) : null}

        {!isListLoading && !listError && items.length === 0 ? (
          <p className="text-sm text-muted">{t("listEmpty")}</p>
        ) : null}

        {!isListLoading && !listError && items.length > 0 ? (
          <ul className="space-y-3">
            {items.map((item) => (
              <li
                key={item.id}
                className="rounded-[var(--radius-soft)] border border-surface-border/80 bg-background p-3"
              >
                <div className="mb-2 flex items-center justify-between gap-2">
                  <span className="text-sm font-medium">{item.name}</span>
                  <time className="text-xs text-muted">
                    {formatCreatedAt(item.createdAt)}
                  </time>
                </div>
                <p className="whitespace-pre-wrap text-sm text-muted">{item.message}</p>
              </li>
            ))}
          </ul>
        ) : null}
      </Card>
    </div>
  );
}
