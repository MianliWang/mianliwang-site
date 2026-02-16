import { cn } from "@/lib/cn";
import type { InputHTMLAttributes } from "react";

export function inputClassName(className?: string) {
  return cn("ui-field", className);
}

type InputProps = InputHTMLAttributes<HTMLInputElement>;

export function Input({ className, ...props }: InputProps) {
  return <input className={inputClassName(className)} {...props} />;
}
