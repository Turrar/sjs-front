import { cn } from "@/lib/cn";

/** Контент кабинета: ограничение ширины и ритм секций */
export function PageContainer({
  children,
  className,
  narrow,
}: {
  children: React.ReactNode;
  className?: string;
  /** Узкая колонка (формы, чат) */
  narrow?: boolean;
}) {
  return (
    <div
      className={cn(
        "mx-auto w-full",
        narrow ? "max-w-2xl" : "max-w-5xl",
        className,
      )}
    >
      {children}
    </div>
  );
}

export function PageHeader({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <header className="mb-8 flex flex-col gap-4 border-b border-border/70 pb-8 sm:flex-row sm:items-start sm:justify-between">
      <div className="min-w-0 space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground sm:text-[1.75rem] sm:leading-tight">
          {title}
        </h1>
        {description ? (
          <p className="max-w-2xl text-sm leading-relaxed text-muted-foreground">
            {description}
          </p>
        ) : null}
      </div>
      {action ? (
        <div className="flex shrink-0 flex-wrap items-center gap-2">{action}</div>
      ) : null}
    </header>
  );
}

export function EmptyState({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-dashed border-border bg-muted/50 px-6 py-14 text-center">
      <p className="font-medium text-foreground">{title}</p>
      {description ? (
        <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-muted-foreground">
          {description}
        </p>
      ) : null}
      {children ? <div className="mt-6 flex justify-center">{children}</div> : null}
    </div>
  );
}

export function LoadingHint({ label = "Загрузка…" }: { label?: string }) {
  return (
    <p className="flex items-center gap-2 text-sm text-muted-foreground">
      <span
        className="inline-flex h-4 w-4 animate-spin rounded-full border-2 border-muted-foreground/30 border-t-accent"
        aria-hidden
      />
      {label}
    </p>
  );
}
