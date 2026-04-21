import Link from "next/link";
import type { Job } from "@/lib/types";
import { jobCardChipLabels, jobLocationLine } from "@/lib/job-display";
import { cn } from "@/lib/cn";

const btnBase =
  "inline-flex items-center justify-center gap-2 rounded-xl px-6 py-3 text-base font-medium transition-[transform,opacity,box-shadow] active:scale-[0.98]";
const btnPrimary =
  "bg-accent text-accent-foreground shadow-sm shadow-accent/20 hover:brightness-105";
const btnSecondary =
  "border border-border bg-card text-foreground shadow-sm hover:bg-muted/80";

function currencySymbol(code: string | null | undefined): string {
  const c = (code ?? "").toUpperCase();
  if (c === "KZT" || c === "₸") return "₸";
  if (c === "USD") return "$";
  if (c === "EUR") return "€";
  if (c === "RUB") return "₽";
  return c || "";
}

function formatSalary(job: Job): { line: string; periodHint: string } | null {
  if (job.salaryMin == null && job.salaryMax == null) return null;
  const sym = currencySymbol(job.currency);
  const fmt = (n: number) => n.toLocaleString("ru-RU");
  const min = job.salaryMin != null ? fmt(job.salaryMin) : "—";
  const max = job.salaryMax != null ? fmt(job.salaryMax) : "—";
  const line = sym ? `${min} – ${max} ${sym}` : `${min} – ${max}`;
  return { line, periodHint: "за месяц" };
}

type JobCardProps = {
  job: Job;
  className?: string;
  /** Список вакансий в кабинете: `/dashboard/jobs`, иначе `/jobs` */
  detailBasePath?: string;
};

/**
 * Карточка вакансии (как в маркетинговых листингах: зарплата, теги, компания, кнопки).
 */
export function JobCard({
  job,
  className,
  detailBasePath = "/jobs",
}: JobCardProps) {
  const href = `${detailBasePath.replace(/\/$/, "")}/${job.id}`;
  const salary = formatSalary(job);
  const tags = jobCardChipLabels(job);
  const locationLine = jobLocationLine(job);
  const companyName =
    job.employer?.companyName?.trim() || "Работодатель";
  const hiringOpen = job.status === "PUBLISHED";

  return (
    <article
      className={cn(
        "rounded-2xl border border-border bg-card p-6 shadow-sm transition hover:shadow-md",
        className,
      )}
    >
      <div className="mb-2 flex flex-wrap items-start justify-between gap-2">
        <h2 className="text-2xl font-semibold leading-tight tracking-tight text-foreground">
          {job.title}
        </h2>
        {job.isPremium ? (
          <span className="shrink-0 rounded-lg bg-amber-500/15 px-2.5 py-1 text-xs font-semibold text-amber-800 dark:text-amber-200">
            Премиум
          </span>
        ) : null}
      </div>

      {salary ? (
        <div className="mb-3 text-xl font-medium text-foreground">
          {salary.line}
          <span className="ml-2 text-sm font-normal text-muted-foreground">
            {salary.periodHint}
          </span>
        </div>
      ) : (
        <p className="mb-3 text-sm text-muted-foreground">Зарплата по договорённости</p>
      )}

      <div className="mb-4 flex flex-wrap gap-2">
        {tags.map((t) => (
          <span
            key={t}
            className="rounded-lg bg-muted px-3 py-1 text-sm text-foreground"
          >
            {t}
          </span>
        ))}
      </div>

      <div className="mb-1 text-sm">
        <span className="font-medium text-foreground">{companyName}</span>
        {hiringOpen ? (
          <span className="ml-2 inline-flex items-center rounded bg-success/15 px-2 py-0.5 text-xs font-medium text-success">
            Онлайн
          </span>
        ) : (
          <span className="ml-2 inline-flex items-center rounded bg-muted px-2 py-0.5 text-xs text-muted-foreground">
            {job.status}
          </span>
        )}
      </div>

      {locationLine ? (
        <div className="mb-4 text-sm text-muted-foreground">{locationLine}</div>
      ) : (
        <div className="mb-4 text-sm text-muted-foreground">Локация не указана</div>
      )}

      <div className="mb-5">
        <span className="inline-flex rounded-lg bg-success/15 px-3 py-1 text-sm font-medium text-success">
          Отклик без резюме
        </span>
      </div>

      <div className="flex flex-wrap gap-3">
        <Link href={href} className={cn(btnBase, btnPrimary)}>
          Откликнуться
        </Link>
        <Link href={href} className={cn(btnBase, btnSecondary)}>
          Связаться
        </Link>
      </div>
    </article>
  );
}
