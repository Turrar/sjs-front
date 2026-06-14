import { cn } from "@/lib/cn";

export function Skeleton({
  className,
}: {
  className?: string;
}) {
  return (
    <div
      className={cn("animate-pulse rounded-lg bg-muted", className)}
      aria-hidden
    />
  );
}

export function JobCardSkeleton() {
  return (
    <div
      className="rounded-2xl border border-border bg-card p-6 shadow-sm"
      aria-hidden
    >
      <div className="mb-3 flex justify-between gap-3">
        <Skeleton className="h-7 w-2/3 max-w-xs" />
        <Skeleton className="h-6 w-16 shrink-0" />
      </div>
      <Skeleton className="mb-4 h-6 w-40" />
      <div className="mb-4 flex gap-2">
        <Skeleton className="h-7 w-20" />
        <Skeleton className="h-7 w-24" />
      </div>
      <Skeleton className="mb-2 h-4 w-48" />
      <Skeleton className="mb-5 h-4 w-32" />
      <div className="flex gap-3">
        <Skeleton className="h-11 w-32" />
        <Skeleton className="h-11 w-28" />
      </div>
    </div>
  );
}

export function ApplicationCardSkeleton() {
  return (
    <div
      className="rounded-2xl border border-border bg-card p-4 shadow-[var(--shadow-card)]"
      aria-hidden
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0 flex-1 space-y-2">
          <Skeleton className="h-5 w-48" />
          <Skeleton className="h-4 w-36" />
          <Skeleton className="h-6 w-24" />
        </div>
        <div className="flex gap-2">
          <Skeleton className="h-10 w-24" />
          <Skeleton className="h-10 w-20" />
        </div>
      </div>
    </div>
  );
}

export function NotificationCardSkeleton() {
  return (
    <div
      className="rounded-2xl border border-border bg-card p-6 shadow-[var(--shadow-card)]"
      aria-hidden
    >
      <div className="space-y-2">
        <Skeleton className="h-5 w-40" />
        <Skeleton className="h-4 w-full max-w-md" />
        <Skeleton className="h-4 w-3/4 max-w-sm" />
      </div>
      <Skeleton className="mt-4 h-9 w-28" />
    </div>
  );
}

export function JobCardSkeletonList({ count = 3 }: { count?: number }) {
  return (
    <div className="flex flex-col gap-6" aria-busy aria-label="Загрузка вакансий">
      {Array.from({ length: count }, (_, i) => (
        <JobCardSkeleton key={i} />
      ))}
    </div>
  );
}

export function ApplicationCardSkeletonList({ count = 4 }: { count?: number }) {
  return (
    <ul className="flex flex-col gap-4" aria-busy aria-label="Загрузка откликов">
      {Array.from({ length: count }, (_, i) => (
        <li key={i}>
          <ApplicationCardSkeleton />
        </li>
      ))}
    </ul>
  );
}

export function DashboardJobGridSkeleton({ count = 4 }: { count?: number }) {
  return (
    <ul className="grid gap-4 sm:grid-cols-2" aria-busy aria-label="Загрузка рекомендаций">
      {Array.from({ length: count }, (_, i) => (
        <li key={i}>
          <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
            <Skeleton className="h-5 w-4/5" />
            <Skeleton className="mt-2 h-4 w-1/2" />
            <div className="mt-4 flex gap-2">
              <Skeleton className="h-6 w-16" />
              <Skeleton className="h-6 w-20" />
            </div>
          </div>
        </li>
      ))}
    </ul>
  );
}

export function NotificationCardSkeletonList({ count = 5 }: { count?: number }) {
  return (
    <ul className="flex flex-col gap-4" aria-busy aria-label="Загрузка уведомлений">
      {Array.from({ length: count }, (_, i) => (
        <li key={i}>
          <NotificationCardSkeleton />
        </li>
      ))}
    </ul>
  );
}

export function FormSkeleton({ fields = 6 }: { fields?: number }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-6 shadow-sm" aria-busy>
      <Skeleton className="mb-6 h-6 w-40" />
      <div className="space-y-4">
        {Array.from({ length: fields }, (_, i) => (
          <div key={i} className="space-y-2">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-11 w-full" />
          </div>
        ))}
      </div>
      <Skeleton className="mt-6 h-11 w-36" />
    </div>
  );
}

export function TableSkeleton({ rows = 6, cols = 5 }: { rows?: number; cols?: number }) {
  return (
    <div
      className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm"
      aria-busy
      aria-label="Загрузка таблицы"
    >
      <div className="border-b border-border bg-muted/40 p-3">
        <div className="flex gap-4">
          {Array.from({ length: cols }, (_, i) => (
            <Skeleton key={i} className="h-4 flex-1" />
          ))}
        </div>
      </div>
      {Array.from({ length: rows }, (_, r) => (
        <div key={r} className="flex gap-4 border-b border-border/60 p-3 last:border-0">
          {Array.from({ length: cols }, (_, c) => (
            <Skeleton key={c} className="h-4 flex-1" />
          ))}
        </div>
      ))}
    </div>
  );
}

export function StatsGridSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4" aria-busy>
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className="rounded-2xl border border-border bg-card p-6 shadow-sm">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="mt-3 h-8 w-16" />
        </div>
      ))}
    </div>
  );
}

export function DetailPageSkeleton() {
  return (
    <div className="space-y-6" aria-busy aria-label="Загрузка">
      <Skeleton className="h-8 w-2/3 max-w-md" />
      <Skeleton className="h-4 w-48" />
      <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
        <Skeleton className="h-5 w-32" />
        <Skeleton className="mt-4 h-24 w-full" />
        <div className="mt-4 flex gap-2">
          <Skeleton className="h-10 w-28" />
          <Skeleton className="h-10 w-28" />
        </div>
      </div>
    </div>
  );
}

export function ChatSkeleton() {
  return (
    <div className="space-y-4" aria-busy aria-label="Загрузка чата">
      {Array.from({ length: 5 }, (_, i) => (
        <div
          key={i}
          className={cn("flex", i % 2 === 0 ? "justify-start" : "justify-end")}
        >
          <Skeleton className={cn("h-12 rounded-2xl", i % 2 === 0 ? "w-3/5" : "w-2/5")} />
        </div>
      ))}
    </div>
  );
}

export function SimpleListSkeleton({ count = 5 }: { count?: number }) {
  return (
    <ul className="space-y-3" aria-busy>
      {Array.from({ length: count }, (_, i) => (
        <li key={i}>
          <div className="rounded-xl border border-border bg-card p-4">
            <Skeleton className="h-5 w-1/2" />
            <Skeleton className="mt-2 h-4 w-3/4" />
          </div>
        </li>
      ))}
    </ul>
  );
}

export function SessionLoadingSkeleton() {
  return (
    <div
      className="flex flex-col items-center gap-3"
      aria-busy
      aria-label="Загрузка сессии"
    >
      <Skeleton className="h-8 w-8 rounded-full" />
      <Skeleton className="h-4 w-28" />
    </div>
  );
}
