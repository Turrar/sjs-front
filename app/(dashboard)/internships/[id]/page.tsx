"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { routes } from "@/lib/api-routes";
import { ApiError } from "@/lib/api-base";
import { useSession } from "@/components/providers/session-provider";
import { useToast } from "@/components/providers/toast-provider";
import type {
  Internship,
  InternshipLogEntry,
  InternshipTask,
  InternshipTaskStatus,
  InternshipTotalHoursResponse,
} from "@/lib/types";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { RoleGuard } from "@/components/role-guard";
import { PageContainer } from "@/components/layout/page";
import { DetailPageSkeleton } from "@/components/ui/skeleton";
import { getInternshipStatus } from "@/lib/internship-display";
import {
  formatInternshipDate,
  internshipErrorMessage,
} from "@/lib/internship-errors";
import { InternshipLogPanel } from "@/components/internships/internship-log-panel";
import { InternshipTasksBoard } from "@/components/internships/internship-tasks-board";
import { EmployerReviewStatus } from "@/components/reviews/employer-review-modal";
import { cn } from "@/lib/cn";

type DetailTab = "log" | "tasks";

export default function InternshipDetailPage() {
  const params = useParams();
  const internshipId = params.id as string;
  const { api } = useSession();
  const { success: toastSuccess } = useToast();

  const [intern, setIntern] = useState<Internship | null>(null);
  const [totalHours, setTotalHours] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [taskError, setTaskError] = useState<string | null>(null);
  const [tab, setTab] = useState<DetailTab>("log");

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [internData, hoursData] = await Promise.all([
        api.get<Internship>(routes.internships.byId(internshipId)),
        api
          .get<InternshipTotalHoursResponse>(routes.internships.totalHours(internshipId))
          .then((r) => r.totalHours)
          .catch(() => 0),
      ]);
      setIntern(internData);
      setTotalHours(hoursData);
    } catch (e) {
      setError(internshipErrorMessage(e, "Ошибка загрузки"));
    } finally {
      setLoading(false);
    }
  }, [api, internshipId]);

  useEffect(() => {
    void load();
  }, [load]);

  async function addLogEntry(payload: {
    date: string;
    hours: number;
    description?: string;
  }) {
    const entry = await api.post<InternshipLogEntry>(
      routes.internships.log(internshipId),
      payload,
    );
    setIntern((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        logEntries: [...(prev.logEntries ?? []), entry],
      };
    });
    const hoursRes = await api.get<InternshipTotalHoursResponse>(
      routes.internships.totalHours(internshipId),
    );
    setTotalHours(hoursRes.totalHours);
    toastSuccess("Запись добавлена");
  }

  async function updateTaskStatus(task: InternshipTask, status: InternshipTaskStatus) {
    setTaskError(null);
    try {
      const updated = await api.patch<InternshipTask>(
        routes.internships.patchTask(task.id),
        { status },
      );
      setIntern((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          tasks: prev.tasks?.map((t) => (t.id === task.id ? updated : t)),
        };
      });
    } catch (e) {
      setTaskError(internshipErrorMessage(e, "Не удалось обновить задачу"));
      throw e;
    }
  }

  const isActive = intern?.status === "ACTIVE";
  const isCompleted = intern?.status === "COMPLETED";
  const startedLabel = formatInternshipDate(intern?.startedAt ?? intern?.createdAt);
  const endedLabel = formatInternshipDate(intern?.endedAt);

  return (
    <RoleGuard allow={["STUDENT"]}>
      <PageContainer className="py-6 md:py-8">
        <Link
          href="/internships"
          className="mb-5 inline-flex items-center gap-2 text-sm font-medium text-muted-foreground transition-colors hover:text-accent"
        >
          <span aria-hidden>←</span> Стажировки
        </Link>

        {loading ? (
          <DetailPageSkeleton />
        ) : error ? (
          <p className="rounded-xl border border-danger/30 bg-danger/5 px-4 py-3 text-sm text-danger">
            {error}
          </p>
        ) : intern ? (
          <div className="space-y-6">
            <div className="rounded-2xl border border-border/80 bg-card p-5 shadow-sm">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="min-w-0 space-y-2">
                  <h1 className="text-2xl font-semibold tracking-tight text-foreground">
                    {intern.application?.job?.title ?? "Стажировка"}
                  </h1>
                  <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                    {(() => {
                      const st = getInternshipStatus(intern.status);
                      return (
                        <span
                          className={cn(
                            "rounded-full px-2.5 py-0.5 text-xs font-medium",
                            st.className,
                          )}
                        >
                          {st.label}
                        </span>
                      );
                    })()}
                    {startedLabel ? <span>Старт: {startedLabel}</span> : null}
                    {endedLabel ? <span>Завершение: {endedLabel}</span> : null}
                  </div>
                </div>
                <div className="rounded-xl border border-border/70 bg-muted/25 px-4 py-3 text-center">
                  <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                    Всего часов
                  </p>
                  <p className="mt-1 text-2xl font-bold tabular-nums text-foreground">
                    {totalHours}
                  </p>
                </div>
              </div>
            </div>

            <div className="flex gap-1 rounded-xl border border-border bg-muted/30 p-1">
              {(
                [
                  { id: "log" as const, label: "Журнал" },
                  { id: "tasks" as const, label: "Задачи" },
                ] as const
              ).map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setTab(item.id)}
                  className={cn(
                    "flex-1 rounded-lg px-4 py-2 text-sm font-medium transition-colors",
                    tab === item.id
                      ? "bg-card text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  {item.label}
                </button>
              ))}
            </div>

            {tab === "log" ? (
              <InternshipLogPanel
                totalHours={totalHours}
                logEntries={intern.logEntries ?? []}
                canAdd={isActive}
                onAdd={addLogEntry}
              />
            ) : (
              <section>
                <h2 className="mb-3 text-base font-semibold text-foreground">Задачи</h2>
                <InternshipTasksBoard
                  tasks={intern.tasks ?? []}
                  editable={isActive}
                  error={taskError}
                  onStatusChange={updateTaskStatus}
                />
              </section>
            )}

            {isCompleted ? (
              <Card>
                <CardTitle as="h2" className="mb-3 text-base">
                  Отзыв работодателя
                </CardTitle>
                {intern.employerRating != null ? (
                  <>
                    <div className="mb-3 flex items-center gap-2">
                      <span className="text-2xl font-bold tabular-nums text-foreground">
                        {intern.employerRating}
                      </span>
                      <span className="text-muted-foreground">/5</span>
                    </div>
                    {intern.employerFeedback ? (
                      <p className="text-sm leading-relaxed text-foreground">
                        {intern.employerFeedback}
                      </p>
                    ) : null}
                  </>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    Отзыв ещё не оставлен.
                  </p>
                )}
              </Card>
            ) : null}

            <Card>
              <CardTitle as="h2" className="mb-3 text-base">
                Отзыв о компании
              </CardTitle>
              <CardDescription className="mb-4">
                {isCompleted
                  ? "Поделитесь впечатлением о стажировке."
                  : "Можно оставить в любой момент; после завершения стажировки это особенно полезно."}
              </CardDescription>
              <EmployerReviewStatus
                hasReviewed={intern.hasReviewed === true}
                employerUserId={intern.employerUserId}
                onReviewed={() =>
                  setIntern((prev) =>
                    prev ? { ...prev, hasReviewed: true } : prev,
                  )
                }
              />
            </Card>
          </div>
        ) : null}
      </PageContainer>
    </RoleGuard>
  );
}
