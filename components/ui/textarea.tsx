import { cn } from "@/lib/cn";
import type { TextareaHTMLAttributes } from "react";

export function textareaClassName(className?: string) {
  return cn("ui-field ui-field-textarea", className);
}

type TextareaProps = TextareaHTMLAttributes<HTMLTextAreaElement>;

export function Textarea({ className, ...props }: TextareaProps) {
  return <textarea className={textareaClassName(className)} {...props} />;
}
