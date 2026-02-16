import { cn } from "@/lib/cn";
import type { ButtonHTMLAttributes } from "react";

export type ButtonVariant = "primary" | "secondary" | "ghost";

export function buttonClassName(
  variant: ButtonVariant = "secondary",
  className?: string,
) {
  return cn(
    "ui-control",
    variant === "primary" && "ui-control-primary",
    variant === "secondary" && "ui-control-secondary",
    variant === "ghost" && "ui-control-ghost",
    className,
  );
}

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
};

export function Button({
  variant = "secondary",
  className,
  ...props
}: ButtonProps) {
  return <button className={buttonClassName(variant, className)} {...props} />;
}
