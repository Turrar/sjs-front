"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { routes } from "@/lib/api-routes";
import { ApiError } from "@/lib/api-base";
import { RoleGuard } from "@/components/role-guard";
import { useSession } from "@/components/providers/session-provider";
import type { Internship } from "@/lib/types";
import { getInternshipStatus } from "@/lib/internship-display";
import { Card } from "@/components/ui/card";
import {
  EmptyState,
  PageContainer,
  PageHeader,
} from "@/components/layout/page";
import { SimpleListSkeleton } from "@/components/ui/skeleton";

function taskProgress(internship: Internship): string {
  const tasks = internship.tasks ?? [];
  if (tasks.length === 0) return "Нет задач";
  const done = tasks.filter((t) => t.status === "DONE").length;
  return `${done}/${tasks.length} задач`;
}

export default function EmployerInternshipsPage() {
  const { api } = useSession();
  const [internships, setInternships] = useState<Internship[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await api.get<Internship[]>(routes.internships.mine);
        if (!cancelled) setInternships(data);
      } catch (e) {
        if (!cancelled) setError(e instanceof ApiError ? e.message : "Ошибка загрузки");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [api]);

  return (
    <RoleGuard allow={["EMPLOYER"]}>
      <PageContainer>
        <PageHeader
          title="Стажировки"
          description="Список активных и завершённых стажировок ваших кандидатов."
        />
        {error && (
          <p className="mb-6 rounded-xl border border-danger/30 bg-danger/5 px-4 py-3 text-sm text-danger">
            {error}
          </p>
        )}
        {loading ? (
          <SimpleListSkeleton count={4} />
        ) : (
          <ul className="flex flex-col gap-4">
            {internships.map((intern) => {
              const st = getInternshipStatus(intern.status);
              const student = intern.application?.student;
              const job = intern.application?.job;
              return (
                <li key={intern.id}>
                  <Card className="flex flex-col gap-4 transition-colors hover:border-accent/20 sm:flex-row sm:items-center sm:justify-between">
                    <div className="min-w-0 flex-1 space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-semibold text-foreground">
                          {student?.email ?? intern.studentUserId}
                        </span>
                        <span
                          className={`rounded-full px-2 py-0.5 text-xs font-medium ${st.className}`}
                        >
                          {st.label}
                        </span>
                      </div>
                      {job?.title && (
                        <p className="text-sm text-muted-foreground">
                          Вакансия: <span className="text-foreground">{job.title}</span>
                        </p>
                      )}
                      <p className="text-sm text-muted-foreground">
                        Прогресс: {taskProgress(intern)}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Начало: {new Date(intern.createdAt).toLocaleDateString("ru")}
                      </p>
                    </div>
                    <Link
                      href={`/employer/internships/${intern.id}`}
                      className="shrink-0 rounded-xl border border-border px-4 py-2 text-sm font-medium text-foreground transition-colors hover:border-accent/30 hover:text-accent"
                    >
                      Открыть →
                    </Link>
                  </Card>
                </li>
              );
            })}
          </ul>
        )}
        {!loading && internships.length === 0 && !error && (
          <EmptyState
            title="Нет стажировок"
            description="Стажировки создаются из принятых откликов (статус «Оффер»)."
          />
        )}
      </PageContainer>
    </RoleGuard>
  );
}
