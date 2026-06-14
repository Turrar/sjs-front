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
  InternshipTotalHoursResponse,
} from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { RoleGuard } from "@/components/role-guard";
import { PageContainer } from "@/components/layout/page";
import { DetailPageSkeleton } from "@/components/ui/skeleton";
import { getInternshipStatus, getInternshipTaskStatus } from "@/lib/internship-display";
import { StarRating } from "@/components/ui/star-rating";
import { cn } from "@/lib/cn";

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
  const [taskError, setTaskError] = useState<string | null>(null);

  const [reviewRating, setReviewRating] = useState(0);
  const [reviewComment, setReviewComment] = useState("");
  const [reviewAnonymous, setReviewAnonymous] = useState(false);
  const [reviewSaving, setReviewSaving] = useState(false);
  const [reviewDone, setReviewDone] = useState(false);
  const [reviewError, setReviewError] = useState<string | null>(null);

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
      if (internData.hasReviewed) {
        setReviewDone(true);
      }
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Ошибка загрузки");
    } finally {
      setLoading(false);
    }
  }, [api, internshipId]);

  useEffect(() => {
    void load();
  }, [load]);

  async function submitReview() {
    if (!intern || reviewRating < 1) {
      setReviewError("Укажите оценку от 1 до 5");
      return;
    }
    setReviewSaving(true);
    setReviewError(null);
    try {
      await api.post(routes.reviews.create, {
        employerUserId: intern.employerUserId,
        rating: reviewRating,
        comment: reviewComment.trim() || null,
        isAnonymous: reviewAnonymous,
      });
      setReviewDone(true);
    } catch (e) {
      if (e instanceof ApiError && e.status === 409) {
        setReviewDone(true);
        setReviewError(null);
      } else {
        setReviewError(e instanceof ApiError ? e.message : "Не удалось отправить отзыв");
      }
    } finally {
      setReviewSaving(false);
    }
  }

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
      setLogHours("");
      setLogDesc("");
      const hoursRes = await api.get<InternshipTotalHoursResponse>(
        routes.internships.totalHours(internshipId),
      );
      setTotalHours(hoursRes.totalHours);
    } catch (e) {
      setLogError(e instanceof ApiError ? e.message : "Ошибка сохранения");
    } finally {
      setLogSaving(false);
    }
  }

  async function updateTaskStatus(task: InternshipTask) {
    const nextStatus = taskStatusNext[task.status];
    setTaskError(null);
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
    } catch (e) {
      setTaskError(e instanceof ApiError ? e.message : "Не удалось обновить задачу");
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
    <RoleGuard allow={["STUDENT"]}>
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
        <DetailPageSkeleton />
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
                {(() => {
                  const st = getInternshipStatus(intern.status);
                  return (
                    <>
                      <span className={cn("rounded-full px-2 py-0.5 text-xs font-medium", st.className)}>
                        {st.label}
                      </span>
                      {" · "}Всего часов:{" "}
                    </>
                  );
                })()}
                <span className="font-semibold text-foreground">{totalHours}</span>
              </p>
            </div>
          </div>

          {/* Tasks board */}
          <section>
            <h2 className="mb-3 text-base font-semibold text-foreground">
              Задачи
            </h2>
            {taskError ? (
              <p className="mb-3 rounded-xl border border-danger/30 bg-danger/5 px-3 py-2 text-sm text-danger">
                {taskError}
              </p>
            ) : null}
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
                    const st = getInternshipTaskStatus(col);
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

          {/* Student review about employer */}
          {intern.status === "COMPLETED" && !reviewDone ? (
            <section>
              <Card>
                <CardTitle as="h2" className="mb-3 text-base">
                  Оставить отзыв о компании
                </CardTitle>
                <CardDescription className="mb-4">
                  Ваш отзыв поможет другим студентам выбрать работодателя.
                </CardDescription>
                <StarRating value={reviewRating} onChange={setReviewRating} />
                <Textarea
                  label="Комментарий (необязательно)"
                  value={reviewComment}
                  onChange={(e) => setReviewComment(e.target.value)}
                  placeholder="Расскажите о вашем опыте стажировки…"
                />
                <label className="mt-3 flex cursor-pointer items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={reviewAnonymous}
                    onChange={(e) => setReviewAnonymous(e.target.checked)}
                  />
                  Опубликовать анонимно
                </label>
                {reviewError && (
                  <p className="mt-3 text-sm text-danger">{reviewError}</p>
                )}
                <Button
                  type="button"
                  className="mt-4"
                  disabled={reviewSaving || reviewRating < 1}
                  onClick={() => void submitReview()}
                >
                  {reviewSaving ? "Отправка…" : "Отправить отзыв"}
                </Button>
              </Card>
            </section>
          ) : reviewDone ? (
            <section>
              <Card className="border-success/30 bg-success/5">
                <p className="text-sm font-medium text-success">
                  Спасибо! Отзыв отправлен.
                </p>
              </Card>
            </section>
          ) : null}
        </div>
      ) : null}
    </PageContainer>
    </RoleGuard>
  );
}
