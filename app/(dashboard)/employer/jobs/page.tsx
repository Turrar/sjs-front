"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { routes } from "@/lib/api-routes";
import { ApiError } from "@/lib/api-base";
import { RoleGuard } from "@/components/role-guard";
import { useSession } from "@/components/providers/session-provider";
import type { Job, JobStatus, KaspiPaymentResponse } from "@/lib/types";
import { salaryLine } from "@/lib/job-display";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  EmptyState,
  LoadingHint,
  PageContainer,
  PageHeader,
} from "@/components/layout/page";

const jobStatusStyle: Record<JobStatus, string> = {
  DRAFT:     "bg-muted/70 text-muted-foreground",
  PUBLISHED: "bg-success/10 text-success",
  PAUSED:    "bg-amber-500/10 text-amber-700",
  CLOSED:    "bg-muted/70 text-muted-foreground",
  ARCHIVED:  "bg-muted/50 text-muted-foreground",
};

const jobStatusLabel: Record<JobStatus, string> = {
  DRAFT:    "Черновик",
  PUBLISHED: "Опубликована",
  PAUSED:   "Приостановлена",
  CLOSED:   "Закрыта",
  ARCHIVED: "Архив",
};

export default function EmployerJobsPage() {
  const { api } = useSession();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [promotingId, setPromotingId] = useState<string | null>(null);

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
      alert(e instanceof ApiError ? e.message : "Не удалось удалить");
    }
  }

  async function promoteJob(id: string) {
    setPromotingId(id);
    try {
      const res = await api.post<KaspiPaymentResponse>(routes.payments.kaspiPremium(id), {});
      window.open(res.paymentUrl, "_blank");
    } catch (e) {
      alert(e instanceof ApiError ? e.message : "Не удалось создать платёж");
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
        {error ? (
          <p className="mb-6 rounded-xl border border-danger/30 bg-danger/5 px-4 py-3 text-sm text-danger">
            {error}
          </p>
        ) : null}
        {loading ? (
          <LoadingHint />
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
                          href={`/jobs/${job.id}`}
                          className="font-semibold text-foreground transition-colors hover:text-accent"
                        >
                          {job.title}
                        </Link>
                        {job.isPremium && (
                          <span className="rounded-full bg-amber-400/20 px-2 py-0.5 text-xs font-semibold text-amber-700">
                            ★ Premium
                          </span>
                        )}
                      </div>
                      <div className="mt-1.5 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                        <span
                          className={`rounded-md px-2 py-0.5 text-xs font-medium ${jobStatusStyle[job.status]}`}
                        >
                          {jobStatusLabel[job.status]}
                        </span>
                        {job.location || job.city?.name ? (
                          <span>{job.city?.name ?? job.location}</span>
                        ) : null}
                        {salary ? <span>{salary}</span> : null}
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {!job.isPremium && job.status === "PUBLISHED" && (
                        <Button
                          variant="secondary"
                          type="button"
                          disabled={promotingId === job.id}
                          onClick={() => void promoteJob(job.id)}
                        >
                          {promotingId === job.id ? "…" : "Продвинуть"}
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
