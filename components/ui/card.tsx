import { cn } from "@/lib/cn";
import type { ComponentPropsWithoutRef, ElementType, ReactNode } from "react";

type CardProps<T extends ElementType = "div"> = {
  as?: T;
  interactive?: boolean;
  children: ReactNode;
  className?: string;
} & Omit<ComponentPropsWithoutRef<T>, "as" | "children" | "className">;

export function Card<T extends ElementType = "div">({
  as,
  interactive = false,
  className,
  children,
  ...props
}: CardProps<T>) {
  const Component = (as ?? "div") as ElementType;

  return (
    <Component
      className={cn("ui-card", interactive && "ui-card-interactive", className)}
      {...props}
    >
      {children}
    </Component>
  );
}
