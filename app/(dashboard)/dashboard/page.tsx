"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { RoleGuard } from "@/components/role-guard";
import { useSession } from "@/components/providers/session-provider";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PageContainer, PageHeader } from "@/components/layout/page";
import { DashboardJobGridSkeleton } from "@/components/ui/skeleton";
import { routes } from "@/lib/api-routes";
import type { JobWithMatchScore, StudentProfile } from "@/lib/types";
import { cn } from "@/lib/cn";
import { jobLocationLine, salaryLine } from "@/lib/job-display";

function matchScoreRing(score: number) {
  if (score >= 80) return "bg-accent text-accent-foreground";
  if (score >= 50) return "bg-accent/20 text-accent";
  return "bg-muted text-muted-foreground";
}

function profileProgress(profile: StudentProfile | null): {
  filled: number;
  total: number;
  missing: string[];
} {
  if (!profile) return { filled: 0, total: 7, missing: [] };
  const checks: { label: string; ok: boolean }[] = [
    { label: "Имя", ok: !!profile.firstName },
    { label: "Фамилия", ok: !!profile.lastName },
    { label: "Телефон", ok: !!profile.phone },
    { label: "Вуз", ok: !!profile.university },
    { label: "Специальность", ok: !!profile.specialty },
    { label: "О себе", ok: !!profile.bio },
    { label: "GitHub", ok: !!profile.githubUsername },
  ];
  const filled = checks.filter((c) => c.ok).length;
  const missing = checks.filter((c) => !c.ok).map((c) => c.label);
  return { filled, total: checks.length, missing };
}

const quickLinks = [
  { href: "/schedule", label: "Загрузить расписание", hint: "PDF из журнала" },
  { href: "/resume", label: "Создать резюме", hint: "Черновик и PDF" },
  { href: "/skill-tests", label: "Пройти тест навыков", hint: "Получить бейдж" },
  { href: "/job-alerts", label: "Настроить подписки", hint: "Новые вакансии" },
];

export default function StudentDashboardPage() {
  const { user, api } = useSession();
  const [jobs, setJobs] = useState<JobWithMatchScore[]>([]);
  const [loadingJobs, setLoadingJobs] = useState(true);
  const [jobsError, setJobsError] = useState<string | null>(null);

  const studentProfile =
    user?.profile && "firstName" in user.profile
      ? (user.profile as StudentProfile)
      : null;

  const progress = profileProgress(studentProfile);

  const loadRecommended = useCallback(async () => {
    setLoadingJobs(true);
    setJobsError(null);
    try {
      const data = await api.get<JobWithMatchScore[]>(
        `${routes.jobs.recommended}?limit=4`,
      );
      setJobs(data);
    } catch {
      setJobsError("Рекомендации временно недоступны");
    } finally {
      setLoadingJobs(false);
    }
  }, [api]);

  useEffect(() => {
    void loadRecommended();
  }, [loadRecommended]);

  const displayName =
    studentProfile?.firstName ?? user?.email?.split("@")[0] ?? "студент";

  return (
    <RoleGuard allow={["STUDENT"]}>
      <PageContainer>
        <PageHeader
          title={`Привет, ${displayName}`}
          description="Добро пожаловать в SJS — платформу для поиска работы, совместимой с учёбой."
        />

        {/* Profile progress */}
        <Card className="mb-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <CardTitle as="h2" className="text-base">
                Заполненность профиля
              </CardTitle>
              <CardDescription className="mt-1">
                {progress.filled} из {progress.total} полей заполнено
                {progress.missing.length > 0
                  ? ` · не хватает: ${progress.missing.join(", ")}`
                  : ""}
              </CardDescription>
            </div>
            <div className="flex items-center gap-3">
              <span
                className={cn(
                  "text-lg font-bold tabular-nums",
                  progress.filled === progress.total
                    ? "text-success"
                    : "text-foreground",
                )}
              >
                {Math.round((progress.filled / progress.total) * 100)}%
              </span>
              <Link href="/profile">
                <Button variant="secondary" className="shrink-0 text-sm">
                  Редактировать
                </Button>
              </Link>
            </div>
          </div>
          <div className="mt-4 h-2 w-full overflow-hidden rounded-full bg-muted">
            <div
              className={cn(
                "h-full rounded-full transition-all duration-500",
                progress.filled === progress.total ? "bg-success" : "bg-accent",
              )}
              style={{
                width: `${Math.round((progress.filled / progress.total) * 100)}%`,
              }}
            />
          </div>
        </Card>

        {/* Quick actions */}
        <div className="mb-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {quickLinks.map((q) => (
            <Link
              key={q.href}
              href={q.href}
              className="group flex flex-col gap-1 rounded-2xl border border-border bg-card px-4 py-4 transition-[border-color,box-shadow] hover:border-accent/30 hover:shadow-sm"
            >
              <span className="text-sm font-semibold text-foreground group-hover:text-accent">
                {q.label}
              </span>
              <span className="text-xs text-muted-foreground">{q.hint}</span>
            </Link>
          ))}
        </div>

        {/* Recommended jobs */}
        <div className="mb-2 flex items-baseline justify-between">
          <h2 className="text-base font-semibold text-foreground">
            Рекомендованные вакансии
          </h2>
          <Link
            href="/dashboard/jobs"
            className="text-sm font-medium text-accent hover:underline"
          >
            Все вакансии →
          </Link>
        </div>

        {loadingJobs ? (
          <DashboardJobGridSkeleton count={4} />
        ) : jobsError ? (
          <p className="rounded-xl border border-border bg-muted/40 px-4 py-3 text-sm text-muted-foreground">
            {jobsError}
          </p>
        ) : jobs.length === 0 ? (
          <Card>
            <p className="py-4 text-center text-sm text-muted-foreground">
              Нет рекомендаций. Заполните профиль и загрузите расписание.
            </p>
          </Card>
        ) : (
          <ul className="grid gap-4 sm:grid-cols-2">
            {jobs.map((job) => (
              <li key={job.id}>
                <Link href={`/dashboard/jobs/${job.id}`} className="group block h-full">
                  <Card className="flex h-full flex-col gap-3 transition-[border-color,box-shadow] hover:border-accent/30 hover:shadow-md">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="font-semibold text-foreground group-hover:text-accent line-clamp-2">
                          {job.title}
                        </p>
                        {job.employer?.companyName ? (
                          <p className="mt-0.5 text-sm text-muted-foreground">
                            {job.employer.companyName}
                          </p>
                        ) : null}
                      </div>
                      {job.matchScore != null ? (
                        <span
                          className={cn(
                            "shrink-0 rounded-full px-2.5 py-1 text-xs font-bold tabular-nums",
                            matchScoreRing(job.matchScore),
                          )}
                          title="Совпадение с профилем"
                        >
                          {job.matchScore}%
                        </span>
                      ) : null}
                    </div>
                    <div className="mt-auto flex flex-wrap gap-1.5 text-xs text-muted-foreground">
                      {jobLocationLine(job) ? (
                        <span className="rounded-md bg-muted/70 px-2 py-0.5">
                          {jobLocationLine(job)}
                        </span>
                      ) : null}
                      {salaryLine(job) ? (
                        <span className="rounded-md bg-muted/70 px-2 py-0.5">
                          {salaryLine(job)}
                        </span>
                      ) : null}
                      {job.isPremium ? (
                        <span className="rounded-md bg-amber-400/15 px-2 py-0.5 font-medium text-amber-700">
                          Premium
                        </span>
                      ) : null}
                    </div>
                  </Card>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </PageContainer>
    </RoleGuard>
  );
}
