"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { routes } from "@/lib/api-routes";
import { ApiError } from "@/lib/api-base";
import { RoleGuard } from "@/components/role-guard";
import { useSession } from "@/components/providers/session-provider";
import type { Job, KaspiPaymentResponse } from "@/lib/types";
import { jobRequirementBadges } from "@/lib/application-apply";
import { salaryLine, getJobStatusLabel, getJobStatusStyle, jobLocationLine } from "@/lib/job-display";
import { pollKaspiPremiumStatus } from "@/lib/kaspi-payment";
import { PremiumBadge } from "@/components/ui/premium-badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  EmptyState,
  PageContainer,
  PageHeader,
} from "@/components/layout/page";
import { JobCardSkeletonList } from "@/components/ui/skeleton";


export default function EmployerJobsPage() {
  const { api } = useSession();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [promotingId, setPromotingId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const [pollingJobId, setPollingJobId] = useState<string | null>(null);
  const [premiumSuccess, setPremiumSuccess] = useState<string | null>(null);
  const [pollError, setPollError] = useState<string | null>(null);
  const pollAbortRef = useRef<AbortController | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.get<Job[]>(routes.jobs.mine);
      setJobs(data);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Ошибка");
      setJobs([]);
    } finally {
      setLoading(false);
    }
  }, [api]);

  useEffect(() => {
    void load();
  }, [load]);

  async function removeJob(id: string) {
    if (!confirm("Удалить вакансию?")) return;
    try {
      await api.delete(routes.jobs.byId(id));
      await load();
    } catch (e) {
      setActionError(e instanceof ApiError ? e.message : "Не удалось удалить");
    }
  }

  useEffect(() => {
    return () => {
      pollAbortRef.current?.abort();
    };
  }, []);

  async function pollPremiumStatus(jobId: string) {
    pollAbortRef.current?.abort();
    const controller = new AbortController();
    pollAbortRef.current = controller;
    setPollingJobId(jobId);
    setPollError(null);
    setPremiumSuccess(null);

    const result = await pollKaspiPremiumStatus({
      jobId,
      api: (path) => api.get(path),
      signal: controller.signal,
    });

    if (controller.signal.aborted) return;

    setPollingJobId(null);
    if (result.ok) {
      setPremiumSuccess(result.status.title || "Вакансия продвинута");
      await load();
    } else if (result.reason === "timeout") {
      setPollError("Оплата не подтверждена. Обновите страницу позже или повторите оплату.");
      await load();
    } else if (result.reason === "error") {
      setPollError(result.message ?? "Ошибка проверки оплаты");
      await load();
    }
  }

  async function promoteJob(id: string) {
    setPromotingId(id);
    try {
      const res = await api.post<KaspiPaymentResponse>(routes.payments.kaspiPremium(id), {});
      window.open(res.paymentUrl, "_blank");
      void pollPremiumStatus(id);
    } catch (e) {
      setActionError(e instanceof ApiError ? e.message : "Не удалось создать платёж");
    } finally {
      setPromotingId(null);
    }
  }

  return (
    <RoleGuard allow={["EMPLOYER"]}>
      <PageContainer>
        <PageHeader
          title="Мои вакансии"
          description="Черновики, публикация и отклики по каждой позиции."
          action={
            <Link href="/employer/jobs/new">
              <Button>Новая вакансия</Button>
            </Link>
          }
        />
        {actionError ? (
          <p className="mb-6 rounded-xl border border-danger/30 bg-danger/5 px-4 py-3 text-sm text-danger">
            {actionError}
          </p>
        ) : null}
        {error ? (
          <p className="mb-6 rounded-xl border border-danger/30 bg-danger/5 px-4 py-3 text-sm text-danger">
            {error}
          </p>
        ) : null}
        {premiumSuccess ? (
          <p className="mb-6 rounded-xl border border-success/30 bg-success/5 px-4 py-3 text-sm text-success">
            {premiumSuccess}
          </p>
        ) : null}
        {pollError ? (
          <p className="mb-6 rounded-xl border border-amber-500/30 bg-amber-500/5 px-4 py-3 text-sm text-amber-800">
            {pollError}
          </p>
        ) : null}
        {loading ? (
          <JobCardSkeletonList count={4} />
        ) : (
          <ul className="flex flex-col gap-4">
            {jobs.map((job) => {
              const salary = salaryLine(job);
              return (
                <li key={job.id}>
                  <Card className="flex flex-col gap-4 transition-colors hover:border-accent/20 sm:flex-row sm:items-center sm:justify-between">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <Link
                          href={`/employer/jobs/${job.id}/edit`}
                          className="font-semibold text-foreground transition-colors hover:text-accent"
                        >
                          {job.title}
                        </Link>
                        {job.isPremium && <PremiumBadge />}
                      </div>
                      <div className="mt-1.5 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                        <span
                          className={`rounded-md px-2 py-0.5 text-xs font-medium ${getJobStatusStyle(job.status)}`}
                        >
                          {getJobStatusLabel(job.status)}
                        </span>
                        {jobLocationLine(job) ? (
                          <span>{jobLocationLine(job)}</span>
                        ) : null}
                        {salary ? <span>{salary}</span> : null}
                      </div>
                      {jobRequirementBadges(job).length > 0 ? (
                        <div className="mt-2 flex flex-wrap gap-2">
                          {jobRequirementBadges(job).map((badge) => (
                            <span
                              key={badge.label}
                              className={`rounded-full px-2 py-0.5 text-xs font-medium ${badge.className}`}
                            >
                              {badge.label}
                            </span>
                          ))}
                        </div>
                      ) : null}
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {!job.isPremium && job.status === "PUBLISHED" && (
                        <Button
                          variant="secondary"
                          type="button"
                          disabled={promotingId === job.id || pollingJobId === job.id}
                          onClick={() => void promoteJob(job.id)}
                        >
                          {promotingId === job.id
                            ? "…"
                            : pollingJobId === job.id
                              ? "Проверка оплаты…"
                              : "Продвинуть"}
                        </Button>
                      )}
                      <Link href={`/employer/jobs/${job.id}/edit`}>
                        <Button variant="secondary" type="button">
                          Редактировать
                        </Button>
                      </Link>
                      <Link href={`/employer/jobs/${job.id}/applications`}>
                        <Button variant="secondary" type="button">
                          Отклики
                        </Button>
                      </Link>
                      <Button
                        variant="danger"
                        type="button"
                        onClick={() => void removeJob(job.id)}
                      >
                        Удалить
                      </Button>
                    </div>
                  </Card>
                </li>
              );
            })}
          </ul>
        )}
        {!loading && jobs.length === 0 && !error ? (
          <EmptyState
            title="Пока нет вакансий"
            description="Создайте первую — она сохранится как черновик, затем можно опубликовать."
          >
            <Link href="/employer/jobs/new">
              <Button>Создать вакансию</Button>
            </Link>
          </EmptyState>
        ) : null}
      </PageContainer>
    </RoleGuard>
  );
}
