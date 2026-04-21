"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { routes } from "@/lib/api-routes";
import { ApiError } from "@/lib/api-base";
import { useSession } from "@/components/providers/session-provider";
import type {
  Internship,
  InternshipLogEntry,
  InternshipTask,
  InternshipTaskStatus,
} from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { LoadingHint, PageContainer } from "@/components/layout/page";
import { cn } from "@/lib/cn";

const taskStatusLabels: Record<
  InternshipTaskStatus,
  { label: string; className: string }
> = {
  TODO: { label: "К выполнению", className: "bg-muted/70 text-muted-foreground" },
  IN_PROGRESS: { label: "В работе", className: "bg-sky-500/10 text-sky-700" },
  DONE: { label: "Выполнено", className: "bg-success/10 text-success" },
};

const taskStatusNext: Record<InternshipTaskStatus, InternshipTaskStatus> = {
  TODO: "IN_PROGRESS",
  IN_PROGRESS: "DONE",
  DONE: "TODO",
};

export default function InternshipDetailPage() {
  const params = useParams();
  const internshipId = params.id as string;
  const { api } = useSession();

  const [intern, setIntern] = useState<Internship | null>(null);
  const [totalHours, setTotalHours] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [logDate, setLogDate] = useState(
    () => new Date().toISOString().slice(0, 10),
  );
  const [logHours, setLogHours] = useState("");
  const [logDesc, setLogDesc] = useState("");
  const [logSaving, setLogSaving] = useState(false);
  const [logError, setLogError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [internData, hoursData] = await Promise.all([
        api.get<Internship>(routes.internships.byId(internshipId)),
        api.get<number>(routes.internships.totalHours(internshipId)).catch(() => 0),
      ]);
      setIntern(internData);
      setTotalHours(hoursData);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Ошибка загрузки");
    } finally {
      setLoading(false);
    }
  }, [api, internshipId]);

  useEffect(() => {
    void load();
  }, [load]);

  async function addLogEntry() {
    const hours = parseFloat(logHours);
    if (!logDate || isNaN(hours) || hours <= 0) {
      setLogError("Укажите корректную дату и количество часов");
      return;
    }
    setLogSaving(true);
    setLogError(null);
    try {
      const entry = await api.post<InternshipLogEntry>(
        routes.internships.log(internshipId),
        {
          date: logDate,
          hours,
          description: logDesc.trim() || undefined,
        },
      );
      setIntern((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          logEntries: [...(prev.logEntries ?? []), entry],
        };
      });
      setTotalHours((h) => h + hours);
      setLogHours("");
      setLogDesc("");
    } catch (e) {
      setLogError(e instanceof ApiError ? e.message : "Ошибка сохранения");
    } finally {
      setLogSaving(false);
    }
  }

  async function updateTaskStatus(task: InternshipTask) {
    const nextStatus = taskStatusNext[task.status];
    try {
      const updated = await api.patch<InternshipTask>(
        routes.internships.patchTask(task.id),
        { status: nextStatus },
      );
      setIntern((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          tasks: prev.tasks?.map((t) => (t.id === task.id ? updated : t)),
        };
      });
    } catch {
      /* silently fail */
    }
  }

  const tasks = intern?.tasks ?? [];
  const logEntries = intern?.logEntries ?? [];

  const tasksByStatus: Record<InternshipTaskStatus, InternshipTask[]> = {
    TODO: tasks.filter((t) => t.status === "TODO"),
    IN_PROGRESS: tasks.filter((t) => t.status === "IN_PROGRESS"),
    DONE: tasks.filter((t) => t.status === "DONE"),
  };

  return (
    <PageContainer>
      <div className="mb-6">
        <Link
          href="/internships"
          className="text-sm font-medium text-muted-foreground transition-colors hover:text-accent"
        >
          ← Стажировки
        </Link>
      </div>

      {loading ? (
        <LoadingHint />
      ) : error ? (
        <p className="rounded-xl border border-danger/30 bg-danger/5 px-4 py-3 text-sm text-danger">
          {error}
        </p>
      ) : intern ? (
        <div className="space-y-8">
          {/* Header */}
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-foreground">
                {intern.application?.job?.title ?? "Стажировка"}
              </h1>
              <p className="mt-1 text-sm text-muted-foreground">
                Статус: {intern.status} · Всего часов:{" "}
                <span className="font-semibold text-foreground">{totalHours}</span>
              </p>
            </div>
          </div>

          {/* Tasks board */}
          <section>
            <h2 className="mb-3 text-base font-semibold text-foreground">
              Задачи
            </h2>
            {tasks.length === 0 ? (
              <Card>
                <p className="text-center text-sm text-muted-foreground py-4">
                  Задачи появятся здесь после добавления работодателем.
                </p>
              </Card>
            ) : (
              <div className="grid gap-4 sm:grid-cols-3">
                {(["TODO", "IN_PROGRESS", "DONE"] as InternshipTaskStatus[]).map(
                  (col) => {
                    const st = taskStatusLabels[col];
                    return (
                      <div key={col}>
                        <div
                          className={cn(
                            "mb-2 rounded-lg px-3 py-1.5 text-xs font-semibold",
                            st.className,
                          )}
                        >
                          {st.label} ({tasksByStatus[col].length})
                        </div>
                        <div className="space-y-2">
                          {tasksByStatus[col].map((task) => (
                            <div
                              key={task.id}
                              className="rounded-xl border border-border bg-card p-3 shadow-sm"
                            >
                              <p className="text-sm font-medium text-foreground">
                                {task.title}
                              </p>
                              {task.description ? (
                                <p className="mt-1 text-xs text-muted-foreground">
                                  {task.description}
                                </p>
                              ) : null}
                              {task.dueDate ? (
                                <p className="mt-1 text-xs text-muted-foreground">
                                  До: {new Date(task.dueDate).toLocaleDateString()}
                                </p>
                              ) : null}
                              {col !== "DONE" ? (
                                <Button
                                  type="button"
                                  variant="ghost"
                                  className="mt-2 w-full text-xs"
                                  onClick={() => void updateTaskStatus(task)}
                                >
                                  {col === "TODO" ? "Начать" : "Завершить"}
                                </Button>
                              ) : null}
                            </div>
                          ))}
                          {tasksByStatus[col].length === 0 ? (
                            <p className="rounded-xl border border-dashed border-border py-4 text-center text-xs text-muted-foreground">
                              Пусто
                            </p>
                          ) : null}
                        </div>
                      </div>
                    );
                  },
                )}
              </div>
            )}
          </section>

          {/* Log hours */}
          <section>
            <Card>
              <CardTitle as="h2" className="mb-1 text-base">
                Журнал часов
              </CardTitle>
              <CardDescription className="mb-5">
                Суммарно отработано: <strong>{totalHours} ч</strong>
              </CardDescription>

              <div className="grid gap-4 sm:grid-cols-[1fr_1fr_2fr_auto] sm:items-end">
                <Input
                  label="Дата"
                  type="date"
                  value={logDate}
                  onChange={(e) => setLogDate(e.target.value)}
                />
                <Input
                  label="Часы"
                  type="number"
                  min="0.5"
                  step="0.5"
                  value={logHours}
                  onChange={(e) => setLogHours(e.target.value)}
                  placeholder="4"
                />
                <Input
                  label="Описание"
                  value={logDesc}
                  onChange={(e) => setLogDesc(e.target.value)}
                  placeholder="Что сделал?"
                />
                <Button
                  type="button"
                  disabled={logSaving}
                  onClick={() => void addLogEntry()}
                >
                  {logSaving ? "…" : "Добавить"}
                </Button>
              </div>
              {logError ? (
                <p className="mt-3 text-sm text-danger">{logError}</p>
              ) : null}

              {logEntries.length > 0 ? (
                <div className="mt-6 overflow-x-auto rounded-xl border border-border">
                  <table className="w-full min-w-[28rem] border-collapse text-sm">
                    <thead>
                      <tr className="border-b border-border bg-muted/40 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                        <th className="px-4 py-2.5 text-left">Дата</th>
                        <th className="px-4 py-2.5 text-right">Часы</th>
                        <th className="px-4 py-2.5 text-left">Описание</th>
                      </tr>
                    </thead>
                    <tbody>
                      {logEntries
                        .slice()
                        .sort(
                          (a, b) =>
                            new Date(b.date).getTime() - new Date(a.date).getTime(),
                        )
                        .map((entry) => (
                          <tr
                            key={entry.id}
                            className="border-b border-border/60 last:border-0"
                          >
                            <td className="px-4 py-3 text-muted-foreground">
                              {new Date(entry.date).toLocaleDateString()}
                            </td>
                            <td className="px-4 py-3 text-right font-semibold tabular-nums text-foreground">
                              {entry.hours} ч
                            </td>
                            <td className="px-4 py-3 text-foreground">
                              {entry.description ?? "—"}
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              ) : null}
            </Card>
          </section>

          {/* Employer feedback */}
          {intern.status === "COMPLETED" ? (
            <section>
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
            </section>
          ) : null}
        </div>
      ) : null}
    </PageContainer>
  );
}
