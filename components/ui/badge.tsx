import { cn } from "@/lib/cn";

type BadgeVariant = "default" | "accent" | "success" | "danger" | "muted" | "amber" | "violet";

const variantClass: Record<BadgeVariant, string> = {
  default: "bg-muted text-foreground",
  accent: "bg-accent/10 text-accent",
  success: "bg-success/10 text-success",
  danger: "bg-danger/10 text-danger",
  muted: "bg-muted/70 text-muted-foreground",
  amber: "bg-amber-500/10 text-amber-700",
  violet: "bg-violet-500/10 text-violet-700",
};

export function Badge({
  children,
  variant = "default",
  className,
}: {
  children: React.ReactNode;
  variant?: BadgeVariant;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
        variantClass[variant],
        className,
      )}
    >
      {children}
    </span>
  );
}
