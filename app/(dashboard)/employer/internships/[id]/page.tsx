"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { routes } from "@/lib/api-routes";
import { ApiError } from "@/lib/api-base";
import { RoleGuard } from "@/components/role-guard";
import { useSession } from "@/components/providers/session-provider";
import type {
  Internship,
  InternshipTask,
  InternshipLogEntry,
  InternshipTaskStatus,
} from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardTitle } from "@/components/ui/card";
import { getInternshipTaskStatus } from "@/lib/internship-display";
import { StarRating } from "@/components/ui/star-rating";
import { selectClass } from "@/lib/select-class";
import { PageContainer, PageHeader } from "@/components/layout/page";
import { DetailPageSkeleton } from "@/components/ui/skeleton";

const taskStatuses: InternshipTaskStatus[] = ["TODO", "IN_PROGRESS", "DONE"];

export default function EmployerInternshipDetailPage() {
  const params = useParams();
  const internId = params.id as string;
  const { api } = useSession();

  const [internship, setInternship] = useState<Internship | null>(null);
  const [logEntries, setLogEntries] = useState<InternshipLogEntry[]>([]);
  const [totalHours, setTotalHours] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // New task form
  const [taskTitle, setTaskTitle] = useState("");
  const [taskDesc, setTaskDesc] = useState("");
  const [taskDue, setTaskDue] = useState("");
  const [taskSaving, setTaskSaving] = useState(false);

  // Complete form
  const [showComplete, setShowComplete] = useState(false);
  const [feedback, setFeedback] = useState("");
  const [rating, setRating] = useState(0);
  const [completing, setCompleting] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.get<Internship>(routes.internships.byId(internId));
      setInternship(data);
      setLogEntries(data.logEntries ?? []);
      try {
        const h = await api.get<{ totalHours: number }>(routes.internships.totalHours(internId));
        setTotalHours(h.totalHours);
      } catch {
        // optional
      }
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Ошибка загрузки");
    } finally {
      setLoading(false);
    }
  }, [api, internId]);

  useEffect(() => {
    void load();
  }, [load]);

  async function addTask() {
    if (!taskTitle.trim()) return;
    setTaskSaving(true);
    setActionError(null);
    try {
      await api.post<InternshipTask>(routes.internships.createTask(internId), {
        title: taskTitle.trim(),
        description: taskDesc.trim() || null,
        dueDate: taskDue || null,
      });
      setTaskTitle("");
      setTaskDesc("");
      setTaskDue("");
      await load();
    } catch (e) {
      setActionError(e instanceof ApiError ? e.message : "Ошибка");
    } finally {
      setTaskSaving(false);
    }
  }

  async function patchTask(taskId: string, status: InternshipTaskStatus) {
    setActionError(null);
    try {
      await api.patch<InternshipTask>(routes.internships.patchTask(taskId), { status });
      setInternship((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          tasks: prev.tasks?.map((t) => (t.id === taskId ? { ...t, status } : t)),
        };
      });
    } catch (e) {
      setActionError(e instanceof ApiError ? e.message : "Ошибка");
    }
  }

  async function completeInternship() {
    if (rating === 0) {
      setActionError("Укажите рейтинг (1–5 звёзд)");
      return;
    }
    setCompleting(true);
    setActionError(null);
    try {
      await api.post<Internship>(routes.internships.complete(internId), {
        employerFeedback: feedback.trim() || null,
        employerRating: rating,
      });
      await load();
      setShowComplete(false);
    } catch (e) {
      setActionError(e instanceof ApiError ? e.message : "Ошибка");
    } finally {
      setCompleting(false);
    }
  }

  if (loading) {
    return (
      <RoleGuard allow={["EMPLOYER"]}>
        <PageContainer><DetailPageSkeleton /></PageContainer>
      </RoleGuard>
    );
  }

  if (error || !internship) {
    return (
      <RoleGuard allow={["EMPLOYER"]}>
        <PageContainer>
          <p className="rounded-xl border border-danger/30 bg-danger/5 px-4 py-3 text-sm text-danger">
            {error ?? "Стажировка не найдена"}
          </p>
        </PageContainer>
      </RoleGuard>
    );
  }

  const student = internship.application?.student;
  const job = internship.application?.job;
  const tasks = internship.tasks ?? [];
  const tasksByStatus = {
    TODO: tasks.filter((t) => t.status === "TODO"),
    IN_PROGRESS: tasks.filter((t) => t.status === "IN_PROGRESS"),
    DONE: tasks.filter((t) => t.status === "DONE"),
  } as Record<InternshipTaskStatus, InternshipTask[]>;

  return (
    <RoleGuard allow={["EMPLOYER"]}>
      <PageContainer>
        <div className="mb-6">
          <Link
            href="/employer/internships"
            className="text-sm font-medium text-muted-foreground transition-colors hover:text-accent"
          >
            ← Все стажировки
          </Link>
        </div>

        <PageHeader
          title={`Трекер стажировки: ${student?.email ?? internship.studentUserId}`}
          description={job?.title ? `Вакансия: ${job.title}` : undefined}
        />

        {actionError ? (
          <p className="mb-5 rounded-xl border border-danger/30 bg-danger/5 px-4 py-3 text-sm text-danger">
            {actionError}
          </p>
        ) : null}

        {/* Summary */}
        <div className="mb-5 flex flex-wrap gap-4 text-sm text-muted-foreground">
          <span>
            Статус:{" "}
            <span
              className={`font-medium ${
                internship.status === "ACTIVE"
                  ? "text-success"
                  : internship.status === "COMPLETED"
                    ? "text-blue-700"
                    : "text-muted-foreground"
              }`}
            >
              {internship.status === "ACTIVE"
                ? "Активна"
                : internship.status === "COMPLETED"
                  ? "Завершена"
                  : "Отменена"}
            </span>
          </span>
          {totalHours != null && (
            <span>
              Всего часов: <span className="font-medium text-foreground">{totalHours}</span>
            </span>
          )}
          <span>
            Задач: <span className="font-medium text-foreground">{tasks.length}</span>
            {" · "}Готово:{" "}
            <span className="font-medium text-success">
              {tasks.filter((t) => t.status === "DONE").length}
            </span>
          </span>
        </div>

        {/* Kanban-style tasks */}
        <div className="grid gap-5 md:grid-cols-3">
          {(["TODO", "IN_PROGRESS", "DONE"] as InternshipTaskStatus[]).map((col) => (
            <div key={col}>
              <h3
                className={`mb-3 rounded-lg px-3 py-1.5 text-xs font-semibold uppercase tracking-wide ${getInternshipTaskStatus(col).className}`}
              >
                {getInternshipTaskStatus(col).label} ({tasksByStatus[col].length})
              </h3>
              <ul className="flex flex-col gap-3">
                {tasksByStatus[col].map((task) => (
                  <li key={task.id}>
                    <Card className="p-4">
                      <p className="font-medium text-foreground">{task.title}</p>
                      {task.description && (
                        <p className="mt-1 text-sm text-muted-foreground">{task.description}</p>
                      )}
                      {task.dueDate && (
                        <p className="mt-1.5 text-xs text-muted-foreground">
                          Срок: {new Date(task.dueDate).toLocaleDateString("ru")}
                        </p>
                      )}
                      <div className="mt-3">
                        <select
                          className={selectClass}
                          value={task.status}
                          onChange={(e) =>
                            void patchTask(task.id, e.target.value as InternshipTaskStatus)
                          }
                        >
                          {taskStatuses.map((s) => (
                            <option key={s} value={s}>{getInternshipTaskStatus(s).label}</option>
                          ))}
                        </select>
                      </div>
                    </Card>
                  </li>
                ))}
                {tasksByStatus[col].length === 0 && (
                  <li className="rounded-xl border border-dashed border-border px-3 py-6 text-center text-xs text-muted-foreground">
                    Пусто
                  </li>
                )}
              </ul>
            </div>
          ))}
        </div>

        {/* Add task */}
        {internship.status === "ACTIVE" && (
          <Card className="mt-6">
            <CardTitle as="h2" className="mb-4">Добавить задачу</CardTitle>
            <div className="space-y-3">
              <Input
                label="Название задачи"
                value={taskTitle}
                onChange={(e) => setTaskTitle(e.target.value)}
                placeholder="Например: Изучить документацию API"
              />
              <Textarea
                label="Описание (необязательно)"
                value={taskDesc}
                onChange={(e) => setTaskDesc(e.target.value)}
              />
              <Input
                label="Срок (необязательно)"
                type="date"
                value={taskDue}
                onChange={(e) => setTaskDue(e.target.value)}
              />
              <Button
                onClick={() => void addTask()}
                disabled={taskSaving || !taskTitle.trim()}
              >
                {taskSaving ? "Добавление…" : "Добавить задачу"}
              </Button>
            </div>
          </Card>
        )}

        {/* Log of hours */}
        {logEntries.length > 0 && (
          <Card className="mt-6">
            <CardTitle as="h2" className="mb-4">Журнал часов</CardTitle>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground">
                    <th className="pb-2 pr-4">Дата</th>
                    <th className="pb-2 pr-4">Часы</th>
                    <th className="pb-2">Описание</th>
                  </tr>
                </thead>
                <tbody>
                  {logEntries.map((entry) => (
                    <tr key={entry.id} className="border-b border-border/50 last:border-0">
                      <td className="py-2 pr-4 tabular-nums text-muted-foreground">
                        {new Date(entry.date).toLocaleDateString("ru")}
                      </td>
                      <td className="py-2 pr-4 font-medium tabular-nums">{entry.hours}</td>
                      <td className="py-2 text-muted-foreground">
                        {entry.description ?? "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        )}

        {/* Complete internship */}
        {internship.status === "ACTIVE" && (
          <Card className="mt-6">
            <CardTitle as="h2" className="mb-2">Завершить стажировку</CardTitle>
            {!showComplete ? (
              <Button
                variant="secondary"
                onClick={() => setShowComplete(true)}
              >
                Завершить и оставить отзыв
              </Button>
            ) : (
              <div className="space-y-4">
                <Textarea
                  label="Отзыв работодателя"
                  value={feedback}
                  onChange={(e) => setFeedback(e.target.value)}
                  placeholder="Опишите ваши впечатления о стажёре…"
                />
                <div>
                  <p className="mb-2 text-sm font-medium text-foreground">Рейтинг</p>
                  <StarRating value={rating} onChange={setRating} />
                </div>
                <div className="flex gap-3">
                  <Button
                    onClick={() => void completeInternship()}
                    disabled={completing || rating === 0}
                  >
                    {completing ? "Завершение…" : "Подтвердить завершение"}
                  </Button>
                  <Button
                    variant="secondary"
                    onClick={() => setShowComplete(false)}
                  >
                    Отмена
                  </Button>
                </div>
              </div>
            )}
          </Card>
        )}

        {/* Completed summary */}
        {internship.status === "COMPLETED" && internship.employerRating && (
          <Card className="mt-6">
            <CardTitle as="h2" className="mb-3">Итоговый отзыв</CardTitle>
            <div className="flex gap-0.5 text-amber-400">
              {[1, 2, 3, 4, 5].map((n) => (
                <span key={n} className="text-xl">
                  {n <= (internship.employerRating ?? 0) ? "★" : "☆"}
                </span>
              ))}
            </div>
            {internship.employerFeedback && (
              <p className="mt-3 whitespace-pre-wrap text-sm text-foreground">
                {internship.employerFeedback}
              </p>
            )}
          </Card>
        )}
      </PageContainer>
    </RoleGuard>
  );
}
