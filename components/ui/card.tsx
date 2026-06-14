import { cn } from "@/lib/cn";

export function Card({
  children,
  className,
  padding = true,
}: {
  children: React.ReactNode;
  className?: string;
  /** false — для плотных блоков (например чат) */
  padding?: boolean;
}) {
  return (
    <div
      className={cn(
        "rounded-2xl border border-border/90 bg-card text-card-foreground shadow-[var(--shadow-card)] ring-1 ring-black/[0.03]",
        padding && "p-6 sm:p-7",
        className,
      )}
    >
      {children}
    </div>
  );
}

export function CardTitle({
  children,
  className,
  as: Tag = "h2",
}: {
  children: React.ReactNode;
  className?: string;
  as?: "h2" | "h3";
}) {
  return (
    <Tag
      className={cn(
        "text-base font-semibold tracking-tight text-foreground",
        className,
      )}
    >
      {children}
    </Tag>
  );
}

export function CardDescription({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <p className={cn("mt-1 text-sm text-muted-foreground", className)}>
      {children}
    </p>
  );
}
