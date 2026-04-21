"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ApiError } from "@/lib/api-base";
import { useSession } from "@/components/providers/session-provider";
import { routes } from "@/lib/api-routes";
import { fetchPublic } from "@/lib/session-api";
import type { Job } from "@/lib/types";
import { categoryTreeLabel, jobLocationLine } from "@/lib/job-display";
import { JobDescriptionView } from "@/components/job-description-view";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import {
  LoadingHint,
  PageContainer,
} from "@/components/layout/page";

type JobDetailContentProps = {
  /** Куда вести «Все вакансии»: `/jobs` или `/dashboard/jobs` */
  jobsListHref: string;
};

export function JobDetailContent({ jobsListHref }: JobDetailContentProps) {
  const params = useParams();
  const id = params.id as string;
  const router = useRouter();
  const { user, accessToken, api } = useSession();
  const [job, setJob] = useState<Job | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [coverLetter, setCoverLetter] = useState("");
  const [applyError, setApplyError] = useState<string | null>(null);
  const [applyPending, setApplyPending] = useState(false);

  const loginReturnPath = `${jobsListHref.replace(/\/$/, "")}/${id}`;

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const j = await fetchPublic<Job>(
          routes.jobs.byId(id),
          { method: "GET" },
          accessToken ?? undefined,
        );
        if (!cancelled) setJob(j);
      } catch (e) {
        if (!cancelled)
          setError(e instanceof Error ? e.message : "Ошибка загрузки");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id, accessToken]);

  async function apply() {
    if (!user || user.role !== "STUDENT") {
      router.push(
        `/login?from=${encodeURIComponent(loginReturnPath)}`,
      );
      return;
    }
    setApplyError(null);
    setApplyPending(true);
    try {
      const app = await api.post<{ id: string }>(routes.applications.create, {
        jobId: id,
        coverLetter: coverLetter.trim() || undefined,
      });
      router.push(`/applications/${app.id}/chat`);
    } catch (e) {
      setApplyError(
        e instanceof ApiError ? e.message : "Не удалось откликнуться",
      );
    } finally {
      setApplyPending(false);
    }
  }

  if (loading) {
    return (
      <PageContainer narrow className="py-10">
        <LoadingHint />
      </PageContainer>
    );
  }

  if (error || !job) {
    return (
      <PageContainer narrow className="py-10">
        <Card className="border-danger/20 bg-danger/5">
          <p className="text-sm text-danger">
            {error ?? "Вакансия не найдена"}
          </p>
          <Link
            href={jobsListHref}
            className="mt-4 inline-flex text-sm font-medium text-accent underline-offset-4 hover:underline"
          >
            ← К списку вакансий
          </Link>
        </Card>
      </PageContainer>
    );
  }

  const canApply = user?.role === "STUDENT" && job.status === "PUBLISHED";
  const locationLine = jobLocationLine(job);
  const categoryLabels =
    job.categories?.map((c) => categoryTreeLabel(c, job.categories ?? [])) ??
    [];

  return (
    <PageContainer narrow className="py-8 md:py-10">
      <Link
        href={jobsListHref}
        className="mb-8 inline-flex items-center gap-2 text-sm font-medium text-muted-foreground transition-colors hover:text-accent"
      >
        <span aria-hidden>←</span> Все вакансии
      </Link>

      <header className="mb-8 space-y-3 border-b border-border/70 pb-8">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <h1 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
            {job.title}
          </h1>
          {job.isPremium ? (
            <span className="shrink-0 rounded-full bg-amber-500/15 px-3 py-1 text-xs font-semibold text-amber-800 dark:text-amber-200">
              Премиум
            </span>
          ) : null}
        </div>
        {locationLine ? (
          <p className="text-sm text-muted-foreground">{locationLine}</p>
        ) : (
          <p className="text-sm text-muted-foreground">Локация не указана</p>
        )}
        <div className="flex flex-wrap items-center gap-2 text-sm">
          {categoryLabels.map((label) => (
            <span
              key={label}
              className="rounded-full bg-muted px-3 py-1 text-foreground"
            >
              {label}
            </span>
          ))}
          {(job.tags ?? []).map((t) => (
            <span
              key={t.id}
              className="rounded-full border border-border/80 bg-card px-3 py-1 text-muted-foreground"
            >
              {t.name}
            </span>
          ))}
          <span className="rounded-full bg-muted px-3 py-1 text-muted-foreground">
            Статус: {job.status}
          </span>
        </div>
      </header>

      <div className="space-y-6">
        <Card>
          <CardTitle as="h2">Описание</CardTitle>
          <div className="mt-4 max-w-none">
            <JobDescriptionView description={job.description} />
          </div>
        </Card>

        <Card>
          <CardTitle as="h2">Условия</CardTitle>
          <dl className="mt-4 grid gap-4 text-sm sm:grid-cols-2">
            {job.requiredWeeklyHours != null ? (
              <div className="rounded-xl bg-muted/50 px-4 py-3">
                <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Часов в неделю
                </dt>
                <dd className="mt-1 font-medium">{job.requiredWeeklyHours}</dd>
              </div>
            ) : null}
            {job.salaryMin != null || job.salaryMax != null ? (
              <div className="rounded-xl bg-muted/50 px-4 py-3">
                <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Зарплата
                </dt>
                <dd className="mt-1 font-medium">
                  {job.salaryMin ?? "—"} — {job.salaryMax ?? "—"}{" "}
                  {job.currency ?? ""}
                </dd>
              </div>
            ) : null}
          </dl>
        </Card>

        {canApply ? (
          <Card>
            <CardTitle as="h2">Отклик</CardTitle>
            <CardDescription className="mb-4">
              Добавьте сопроводительное письмо при желании.
            </CardDescription>
            <Textarea
              label="Сопроводительное письмо (необязательно)"
              value={coverLetter}
              onChange={(e) => setCoverLetter(e.target.value)}
              maxLength={8000}
            />
            {applyError ? (
              <p className="mt-3 rounded-xl border border-danger/30 bg-danger/5 px-3 py-2 text-sm text-danger">
                {applyError}
              </p>
            ) : null}
            <Button
              className="mt-5"
              onClick={() => void apply()}
              disabled={applyPending}
            >
              {applyPending ? "Отправка…" : "Откликнуться"}
            </Button>
          </Card>
        ) : user?.role !== "STUDENT" ? (
          <p className="rounded-xl border border-border bg-muted/40 px-4 py-3 text-sm text-muted-foreground">
            Отклик доступен для аккаунта студента.
          </p>
        ) : job.status !== "PUBLISHED" ? (
          <p className="rounded-xl border border-border bg-muted/40 px-4 py-3 text-sm text-muted-foreground">
            Отклик возможен только на опубликованные вакансии.
          </p>
        ) : null}
      </div>
    </PageContainer>
  );
}
