"use client";

import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { routes } from "@/lib/api-routes";
import { ApiError } from "@/lib/api-base";
import { RoleGuard } from "@/components/role-guard";
import { useSession } from "@/components/providers/session-provider";
import type { Application, ApplicationStatus } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  EmptyState,
  PageContainer,
  PageHeader,
} from "@/components/layout/page";
import { ApplicationCardSkeletonList } from "@/components/ui/skeleton";
import { Select } from "@/components/ui/select";

import {
  allApplicationStatuses,
  getStatusStyle,
  employerScoreBadgeClass,
} from "@/lib/application-display";
import {
  getEmployerStatusSelectOptions,
  transitionErrorMessage,
} from "@/lib/application-status-fsm";
import { ApplicationResumeCard } from "@/components/applications/application-resume-card";
import { selectClass } from "@/lib/select-class";

export default function JobApplicationsPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const jobId = params.id as string;
  const { api } = useSession();
  const [applications, setApplications] = useState<Application[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [patchError, setPatchError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const filterStatus = searchParams.get("status") as ApplicationStatus | null;

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.get<Application[]>(
        routes.applications.byJob(jobId, filterStatus ?? undefined),
      );
      setApplications(data);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Ошибка");
      setApplications([]);
    } finally {
      setLoading(false);
    }
  }, [jobId, api, filterStatus]);

  useEffect(() => {
    void load();
  }, [load]);

  async function updateStatus(appId: string, status: ApplicationStatus) {
    setPatchError(null);
    try {
      await api.patch<Application>(routes.applications.patchStatus(appId), { status });
      await load();
    } catch (e) {
      const status = e instanceof ApiError ? e.status : undefined;
      setPatchError(
        e instanceof ApiError
          ? status === 400
            ? transitionErrorMessage(400)
            : e.message
          : transitionErrorMessage(),
      );
    }
  }

  function setFilter(status: string) {
    const sp = new URLSearchParams(searchParams.toString());
    if (status) sp.set("status", status);
    else sp.delete("status");
    router.replace(`?${sp.toString()}`);
  }

  const visible = applications
    .slice()
    .sort((a, b) => (b.employerScore ?? 0) - (a.employerScore ?? 0));

  return (
    <RoleGuard allow={["EMPLOYER"]}>
      <PageContainer>
        <div className="mb-6 flex flex-wrap gap-3 text-sm">
          <Link
            href={`/employer/jobs/${jobId}/edit`}
            className="font-medium text-muted-foreground transition-colors hover:text-accent"
          >
            ← Редактировать вакансию
          </Link>
          <span className="text-border">|</span>
          <Link
            href="/employer/jobs"
            className="font-medium text-muted-foreground transition-colors hover:text-accent"
          >
            Все вакансии
          </Link>
        </div>
        <PageHeader
          title="Отклики"
          description="Воронка найма и переписка с кандидатами."
        />

        {/* Filter */}
        <div className="mb-5 flex flex-wrap items-center gap-3">
          <span className="text-sm font-medium text-muted-foreground">Фильтр:</span>
          <Select
            value={filterStatus ?? ""}
            onChange={(e) => setFilter(e.target.value)}
            className="min-w-[160px]"
          >
            <option value="">Все статусы</option>
            {allApplicationStatuses.map((s) => (
              <option key={s} value={s}>{getStatusStyle(s).label}</option>
            ))}
          </Select>
          {filterStatus && (
            <button
              onClick={() => setFilter("")}
              className="text-sm text-muted-foreground hover:text-foreground"
            >
              Сбросить
            </button>
          )}
        </div>

        {patchError ? (
          <p className="mb-6 rounded-xl border border-danger/30 bg-danger/5 px-4 py-3 text-sm text-danger">
            {patchError}
          </p>
        ) : null}

        {error ? (
          <p className="mb-6 rounded-xl border border-danger/30 bg-danger/5 px-4 py-3 text-sm text-danger">
            {error}
          </p>
        ) : null}
        {loading ? (
          <ApplicationCardSkeletonList count={3} />
        ) : (
          <ul className="flex flex-col gap-5">
            {visible.map((app) => {
              const profile = app.studentProfile as {
                firstName?: string;
                lastName?: string;
                university?: string;
                specialty?: string;
              } | null | undefined;
              const name = [profile?.firstName, profile?.lastName].filter(Boolean).join(" ");
              return (
                <li key={app.id}>
                  <Card>
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                      <div className="min-w-0 flex-1 space-y-2">
                        <div className="flex flex-wrap items-center gap-2">
                          {name ? (
                            <span className="font-semibold text-foreground">{name}</span>
                          ) : null}
                          <span className="text-sm text-muted-foreground">
                            {app.student?.email ?? app.studentUserId}
                          </span>
                          {app.employerScore != null && (
                            <span className={employerScoreBadgeClass(app.employerScore)}>
                              AI {app.employerScore}
                            </span>
                          )}
                        </div>
                        {(profile?.university || profile?.specialty) && (
                          <p className="text-sm text-muted-foreground">
                            {[profile.university, profile.specialty].filter(Boolean).join(" · ")}
                          </p>
                        )}
                        <div className="flex flex-wrap items-center gap-2">
                          <span
                            className={`rounded-md px-2 py-0.5 text-xs font-medium ${getStatusStyle(app.status).className}`}
                          >
                            {getStatusStyle(app.status).label}
                          </span>
                          {app.studentUserId && (
                            <Link
                              href={`/profiles/${app.studentUserId}`}
                              target="_blank"
                              className="text-xs text-accent hover:underline"
                            >
                              Открыть профиль ↗
                            </Link>
                          )}
                        </div>
                        {app.resume ? (
                          <div className="mt-2">
                            <ApplicationResumeCard resume={app.resume} compact />
                          </div>
                        ) : null}
                        {app.coverLetter ? (
                          <div className="mt-3 rounded-xl bg-muted/50 p-4">
                            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                              Сопроводительное
                            </p>
                            <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed">
                              {app.coverLetter}
                            </p>
                          </div>
                        ) : null}
                      </div>
                      <div className="flex w-full flex-col gap-2 sm:max-w-[200px]">
                        <Link href={`/employer/applications/${app.id}`}>
                          <Button variant="secondary" type="button" className="w-full">
                            Детали
                          </Button>
                        </Link>
                        <Link href={`/applications/${app.id}/chat`}>
                          <Button variant="secondary" type="button" className="w-full">
                            Чат
                          </Button>
                        </Link>
                        <div className="flex flex-col gap-1.5">
                          <span className="text-xs font-medium text-muted-foreground">
                            Статус воронки
                          </span>
                          <select
                            className={selectClass}
                            value={app.status}
                            onChange={(e) =>
                              void updateStatus(app.id, e.target.value as ApplicationStatus)
                            }
                          >
                            {getEmployerStatusSelectOptions(app.status).map((s) => (
                              <option key={s} value={s}>{getStatusStyle(s).label}</option>
                            ))}
                          </select>
                        </div>
                      </div>
                    </div>
                  </Card>
                </li>
              );
            })}
          </ul>
        )}
        {!loading && visible.length === 0 && !error ? (
          <EmptyState
            title="Нет откликов"
            description={
              filterStatus
                ? `Нет откликов со статусом «${getStatusStyle(filterStatus).label}».`
                : "Когда студенты откликнутся, они появятся здесь."
            }
          />
        ) : null}
      </PageContainer>
    </RoleGuard>
  );
}
