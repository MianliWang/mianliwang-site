import { cn } from "@/lib/cn";

type SectionHeaderProps = {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  className?: string;
};

export function SectionHeader({
  eyebrow,
  title,
  subtitle,
  className,
}: SectionHeaderProps) {
  return (
    <header className={cn("section-header", className)}>
      {eyebrow ? <p className="t-eyebrow">{eyebrow}</p> : null}
      <h2 className="t-section-title">{title}</h2>
      {subtitle ? <p className="t-section-subtitle">{subtitle}</p> : null}
    </header>
  );
}
