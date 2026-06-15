"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { routes } from "@/lib/api-routes";
import { ApiError } from "@/lib/api-base";
import { RoleGuard } from "@/components/role-guard";
import { useSession } from "@/components/providers/session-provider";
import type { Application } from "@/lib/types";
import { jobLocationLine } from "@/lib/job-display";
import { getStatusStyle } from "@/lib/application-display";
import { ApplicationResumeCard } from "@/components/applications/application-resume-card";
import { Button } from "@/components/ui/button";
import {
  EmptyState,
  PageContainer,
  PageHeader,
} from "@/components/layout/page";
import { ApplicationCardSkeletonList } from "@/components/ui/skeleton";
import { cn } from "@/lib/cn";

export default function MyApplicationsPage() {
  const { api } = useSession();
  const [applications, setApplications] = useState<Application[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const data = await api.get<Application[]>(routes.applications.mine);
        if (!cancelled) setApplications(data);
      } catch (e) {
        if (!cancelled)
          setError(e instanceof ApiError ? e.message : "Ошибка загрузки");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [api]);

  return (
    <RoleGuard allow={["STUDENT"]}>
      <PageContainer>
        <PageHeader
          title="Мои отклики"
          description="Статусы откликов и переход к чату с работодателем."
        />

        {error ? (
          <p className="mb-6 rounded-xl border border-danger/30 bg-danger/5 px-4 py-3 text-sm text-danger">
            {error}
          </p>
        ) : null}

        {loading ? (
          <ApplicationCardSkeletonList count={4} />
        ) : applications.length === 0 && !error ? (
          <EmptyState
            title="Пока нет откликов"
            description="Найдите подходящую вакансию и отправьте отклик."
          >
            <Link href="/dashboard/jobs">
              <Button>Смотреть вакансии</Button>
            </Link>
          </EmptyState>
        ) : (
          <ul className="flex flex-col gap-4">
            {applications.map((app) => {
              const st = getStatusStyle(app.status);
              return (
                <li key={app.id}>
                  <div className="flex flex-col gap-4 rounded-2xl border border-border bg-card p-4 shadow-[var(--shadow-card)] transition-[border-color] hover:border-accent/25 sm:flex-row sm:items-center sm:justify-between">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-semibold text-foreground">
                          {app.job?.title ?? "Вакансия"}
                        </p>
                        <span
                          className={cn(
                            "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
                            st.className,
                          )}
                        >
                          {st.label}
                        </span>
                        {app.job?.isPremium ? (
                          <span className="inline-flex items-center rounded-full bg-amber-400/15 px-2 py-0.5 text-xs font-medium text-amber-700">
                            Premium
                          </span>
                        ) : null}
                      </div>
                      {app.job ? (
                        <p className="mt-1 text-sm text-muted-foreground">
                          {app.job.employer?.companyName
                            ? `${app.job.employer.companyName} · `
                            : ""}
                          {jobLocationLine(app.job) ?? "Локация не указана"}
                        </p>
                      ) : null}
                      {app.employerScore != null ? (
                        <p className="mt-1.5 text-xs text-muted-foreground">
                          AI-оценка:{" "}
                          <span
                            className={cn(
                              "font-semibold tabular-nums",
                              app.employerScore >= 70
                                ? "text-success"
                                : app.employerScore >= 40
                                  ? "text-accent"
                                  : "text-muted-foreground",
                            )}
                          >
                            {app.employerScore}
                            <span className="font-normal">/100</span>
                          </span>
                        </p>
                      ) : null}
                      {app.resume ? (
                        <div className="mt-1.5">
                          <ApplicationResumeCard resume={app.resume} compact />
                        </div>
                      ) : null}
                    </div>
                    <div className="flex shrink-0 gap-2">
                      <Link href={`/applications/${app.id}`}>
                        <Button variant="secondary" className="text-sm">
                          Детали
                        </Button>
                      </Link>
                      <Link href={`/applications/${app.id}/chat`}>
                        <Button variant="ghost" className="text-sm">
                          Чат
                        </Button>
                      </Link>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </PageContainer>
    </RoleGuard>
  );
}
