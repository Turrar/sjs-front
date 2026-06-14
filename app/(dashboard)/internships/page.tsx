"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { routes } from "@/lib/api-routes";
import { ApiError } from "@/lib/api-base";
import { RoleGuard } from "@/components/role-guard";
import { useSession } from "@/components/providers/session-provider";
import type { Internship } from "@/lib/types";
import { getInternshipStatus } from "@/lib/internship-display";
import { Button } from "@/components/ui/button";
import {
  EmptyState,
  PageContainer,
  PageHeader,
} from "@/components/layout/page";
import { SimpleListSkeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/cn";

export default function InternshipsPage() {
  const { api } = useSession();
  const [internships, setInternships] = useState<Internship[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.get<Internship[]>(routes.internships.mine);
      setInternships(data);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Ошибка загрузки");
    } finally {
      setLoading(false);
    }
  }, [api]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <RoleGuard allow={["STUDENT"]}>
    <PageContainer>
      <PageHeader
        title="Стажировки"
        description="Трекер задач и журнал часов по вашим активным стажировкам."
      />

      {error ? (
        <p className="mb-6 rounded-xl border border-danger/30 bg-danger/5 px-4 py-3 text-sm text-danger">
          {error}
        </p>
      ) : null}

      {loading ? (
        <SimpleListSkeleton count={4} />
      ) : internships.length === 0 ? (
        <EmptyState
          title="Нет стажировок"
          description="Когда работодатель переведёт отклик в статус «Оффер» и откроет стажировку, здесь появится трекер."
        >
          <Link href="/applications">
            <Button variant="secondary">Мои отклики</Button>
          </Link>
        </EmptyState>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2">
          {internships.map((intern) => {
            const st = getInternshipStatus(intern.status);
            const tasksTotal = intern.tasks?.length ?? 0;
            const tasksDone =
              intern.tasks?.filter((t) => t.status === "DONE").length ?? 0;
            const jobTitle =
              intern.application?.job?.title ?? "Вакансия";
            return (
              <li key={intern.id}>
                <Link href={`/internships/${intern.id}`} className="group block h-full">
                  <div className="flex h-full flex-col gap-3 rounded-2xl border border-border bg-card p-4 shadow-[var(--shadow-card)] transition-[border-color,box-shadow] hover:border-accent/30 hover:shadow-md">
                    <div className="flex items-start justify-between gap-2">
                      <h2 className="font-semibold text-foreground group-hover:text-accent">
                        {jobTitle}
                      </h2>
                      <span
                        className={cn(
                          "shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium",
                          st.className,
                        )}
                      >
                        {st.label}
                      </span>
                    </div>
                    {tasksTotal > 0 ? (
                      <div className="space-y-1.5">
                        <div className="flex justify-between text-xs text-muted-foreground">
                          <span>Задачи</span>
                          <span>
                            {tasksDone}/{tasksTotal}
                          </span>
                        </div>
                        <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                          <div
                            className="h-full rounded-full bg-accent transition-all"
                            style={{
                              width: `${Math.round((tasksDone / tasksTotal) * 100)}%`,
                            }}
                          />
                        </div>
                      </div>
                    ) : null}
                    {intern.employerRating != null ? (
                      <p className="text-xs text-muted-foreground">
                        Оценка работодателя:{" "}
                        <span className="font-semibold text-foreground">
                          {intern.employerRating}/5
                        </span>
                      </p>
                    ) : null}
                    <p className="mt-auto text-xs font-medium text-accent opacity-0 transition-opacity group-hover:opacity-100">
                      Открыть →
                    </p>
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </PageContainer>
    </RoleGuard>
  );
}
