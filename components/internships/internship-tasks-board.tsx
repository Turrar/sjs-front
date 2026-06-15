"use client";

import type { InternshipTask, InternshipTaskStatus } from "@/lib/types";
import { getInternshipTaskStatus } from "@/lib/internship-display";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/cn";

const columns: InternshipTaskStatus[] = ["TODO", "IN_PROGRESS", "DONE"];

const nextStatus: Record<InternshipTaskStatus, InternshipTaskStatus | null> = {
  TODO: "IN_PROGRESS",
  IN_PROGRESS: "DONE",
  DONE: null,
};

const actionLabel: Record<InternshipTaskStatus, string> = {
  TODO: "Начать",
  IN_PROGRESS: "Завершить",
  DONE: "",
};

type InternshipTasksBoardProps = {
  tasks: InternshipTask[];
  editable: boolean;
  error: string | null;
  onStatusChange: (task: InternshipTask, status: InternshipTaskStatus) => Promise<void>;
};

export function InternshipTasksBoard({
  tasks,
  editable,
  error,
  onStatusChange,
}: InternshipTasksBoardProps) {
  const tasksByStatus: Record<InternshipTaskStatus, InternshipTask[]> = {
    TODO: tasks.filter((t) => t.status === "TODO"),
    IN_PROGRESS: tasks.filter((t) => t.status === "IN_PROGRESS"),
    DONE: tasks.filter((t) => t.status === "DONE"),
  };

  if (tasks.length === 0) {
    return (
      <Card>
        <p className="py-6 text-center text-sm text-muted-foreground">
          Задачи появятся после добавления работодателем.
        </p>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      {error ? (
        <p className="rounded-xl border border-danger/30 bg-danger/5 px-3 py-2 text-sm text-danger">
          {error}
        </p>
      ) : null}
      <div className="grid gap-4 sm:grid-cols-3">
        {columns.map((col) => {
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
                {tasksByStatus[col].map((task) => {
                  const next = nextStatus[task.status];
                  return (
                    <div
                      key={task.id}
                      className="rounded-xl border border-border bg-card p-3 shadow-sm"
                    >
                      <p className="text-sm font-medium text-foreground">{task.title}</p>
                      {task.description ? (
                        <p className="mt-1 text-xs text-muted-foreground">
                          {task.description}
                        </p>
                      ) : null}
                      {task.dueDate ? (
                        <p className="mt-1 text-xs text-muted-foreground">
                          До:{" "}
                          {new Date(task.dueDate).toLocaleDateString("ru-RU")}
                        </p>
                      ) : null}
                      {editable && next ? (
                        <Button
                          type="button"
                          variant="ghost"
                          className="mt-2 w-full text-xs"
                          onClick={() => void onStatusChange(task, next)}
                        >
                          {actionLabel[task.status]}
                        </Button>
                      ) : null}
                    </div>
                  );
                })}
                {tasksByStatus[col].length === 0 ? (
                  <p className="rounded-xl border border-dashed border-border py-4 text-center text-xs text-muted-foreground">
                    Пусто
                  </p>
                ) : null}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
