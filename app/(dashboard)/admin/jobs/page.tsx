"use client";

import { useCallback, useEffect, useState } from "react";
import { routes } from "@/lib/api-routes";
import { ApiError } from "@/lib/api-base";
import { getJobStatusLabel, getJobStatusStyle, salaryLine } from "@/lib/job-display";
import { selectClass } from "@/lib/select-class";
import { RoleGuard } from "@/components/role-guard";
import { useSession } from "@/components/providers/session-provider";
import type { AdminJobsResponse, Job, JobStatus } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { PageContainer, PageHeader } from "@/components/layout/page";
import { TableSkeleton } from "@/components/ui/skeleton";

const filterStatuses: (JobStatus | "")[] = ["", "PUBLISHED", "PAUSED", "ARCHIVED", "DRAFT", "CLOSED"];

export default function AdminJobsPage() {
  const { api } = useSession();
  const [page, setPage] = useState(1);
  const limit = 20;
  const [statusFilter, setStatusFilter] = useState<JobStatus | "">("");
  const [result, setResult] = useState<AdminJobsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [moderatingId, setModeratingId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.get<AdminJobsResponse>(
        routes.admin.jobs(page, limit, statusFilter || undefined),
      );
      setResult(data);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Ошибка загрузки");
      setResult(null);
    } finally {
      setLoading(false);
    }
  }, [api, page, limit, statusFilter]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    setPage(1);
  }, [statusFilter]);

  async function moderate(jobId: string, status: "PAUSED" | "ARCHIVED") {
    if (!confirm(`Установить статус ${status}?`)) return;
    setModeratingId(jobId);
    setActionError(null);
    try {
      await api.patch(routes.admin.moderateJob(jobId), { status });
      await load();
    } catch (e) {
      setActionError(e instanceof ApiError ? e.message : "Ошибка модерации");
    } finally {
      setModeratingId(null);
    }
  }

  const rows = result?.data ?? [];
  const totalPages = result ? Math.ceil(result.total / limit) : 1;

  return (
    <RoleGuard allow={["ADMIN"]}>
      <PageContainer>
        <PageHeader
          title="Модерация вакансий"
          description="Список вакансий платформы. Доступные действия: PAUSED и ARCHIVED."
        />

        {actionError ? (
          <p className="mb-4 rounded-xl border border-danger/30 bg-danger/5 px-4 py-3 text-sm text-danger">
            {actionError}
          </p>
        ) : null}

        <div className="mb-4 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            {result && (
              <span className="rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium text-muted-foreground">
                Всего: {result.total}
              </span>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex flex-col gap-1">
              <span className="text-xs font-medium text-muted-foreground">Статус</span>
              <select
                className={selectClass}
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as JobStatus | "")}
              >
                <option value="">Все</option>
                {filterStatuses.filter(Boolean).map((s) => (
                  <option key={s} value={s}>{getJobStatusLabel(s as JobStatus)}</option>
                ))}
              </select>
            </div>
            <div className="flex items-end gap-2 pb-0.5">
              <Button
                type="button"
                variant="secondary"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                ←
              </Button>
              <span className="text-sm text-muted-foreground">{page} / {totalPages || 1}</span>
              <Button
                type="button"
                variant="secondary"
                disabled={!result || page >= totalPages}
                onClick={() => setPage((p) => p + 1)}
              >
                →
              </Button>
            </div>
          </div>
        </div>

        {error && (
          <p className="mb-4 rounded-xl border border-danger/30 bg-danger/5 px-4 py-3 text-sm text-danger">
            {error}
          </p>
        )}

        {loading ? (
          <TableSkeleton rows={8} cols={6} />
        ) : (
          <div className="overflow-x-auto rounded-2xl border border-border/90 shadow-sm">
            <table className="w-full min-w-[900px] text-left text-sm">
              <thead className="bg-muted/60">
                <tr>
                  <th className="p-4 font-semibold">Название</th>
                  <th className="p-4 font-semibold">Статус</th>
                  <th className="p-4 font-semibold">Компания</th>
                  <th className="p-4 font-semibold">Локация / зарплата</th>
                  <th className="p-4 font-semibold">ID</th>
                  <th className="p-4 font-semibold">Действия</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((job: Job) => (
                  <tr key={job.id} className="border-t border-border/80 hover:bg-muted/20">
                    <td className="p-4 font-medium text-foreground">
                      {job.title}
                      {job.isPremium && (
                        <span className="ml-2 rounded-full bg-amber-400/20 px-1.5 py-0.5 text-xs text-amber-700">
                          ★
                        </span>
                      )}
                    </td>
                    <td className="p-4">
                      <span className={`rounded-md px-2 py-0.5 text-xs font-medium ${getJobStatusStyle(job.status)}`}>
                        {getJobStatusLabel(job.status)}
                      </span>
                    </td>
                    <td className="p-4 text-muted-foreground">
                      {job.employer?.companyName ?? job.employerUserId?.slice(0, 8) ?? "—"}
                    </td>
                    <td className="p-4 text-muted-foreground">
                      {[job.city?.name ?? job.location, salaryLine(job)].filter(Boolean).join(" · ") || "—"}
                    </td>
                    <td className="p-4 font-mono text-xs text-muted-foreground">
                      {job.id.slice(0, 8)}…
                    </td>
                    <td className="p-4">
                      <div className="flex flex-wrap gap-1">
                        {job.status !== "PAUSED" && job.status !== "ARCHIVED" && (
                          <Button
                            type="button"
                            variant="secondary"
                            className="px-2 py-1 text-xs"
                            disabled={moderatingId === job.id}
                            onClick={() => void moderate(job.id, "PAUSED")}
                          >
                            Пауза
                          </Button>
                        )}
                        {job.status !== "ARCHIVED" && (
                          <Button
                            type="button"
                            variant="danger"
                            className="px-2 py-1 text-xs"
                            disabled={moderatingId === job.id}
                            onClick={() => void moderate(job.id, "ARCHIVED")}
                          >
                            Архив
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
                {rows.length === 0 && (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-muted-foreground">
                      Нет вакансий{statusFilter ? ` со статусом ${statusFilter}` : ""}.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </PageContainer>
    </RoleGuard>
  );
}
