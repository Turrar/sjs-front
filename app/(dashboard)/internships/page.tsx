"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { routes } from "@/lib/api-routes";
import { RoleGuard } from "@/components/role-guard";
import { useSession } from "@/components/providers/session-provider";
import type { Internship } from "@/lib/types";
import { getInternshipStatus } from "@/lib/internship-display";
import { formatInternshipDate, internshipErrorMessage } from "@/lib/internship-errors";
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
      setError(internshipErrorMessage(e, "Ошибка загрузки"));
    } finally {
      setLoading(false);
    }
  }, [api]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <RoleGuard allow={["STUDENT"]}>
      <PageContainer className="py-6 md:py-8">
        <PageHeader
          title="Стажировки"
          description="Трекер часов и задач после того, как работодатель открыл стажировку по офферу."
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
            description="Когда работодатель переведёт отклик в оффер и откроет трекер, здесь появится карточка стажировки."
          >
            <Link href="/applications">
              <Button variant="secondary">Мои отклики</Button>
            </Link>
          </EmptyState>
        ) : (
          <ul className="grid gap-4 sm:grid-cols-2">
            {internships.map((intern) => {
              const st = getInternshipStatus(intern.status);
              const started = formatInternshipDate(
                intern.startedAt ?? intern.createdAt,
              );
              const jobTitle = intern.application?.job?.title ?? "Стажировка";

              return (
                <li key={intern.id}>
                  <Link href={`/internships/${intern.id}`} className="group block h-full">
                    <div className="flex h-full flex-col gap-3 rounded-2xl border border-border bg-card p-5 shadow-[var(--shadow-card)] transition-[border-color,box-shadow] hover:border-accent/30 hover:shadow-md">
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

                      <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                        {started ? <span>Старт: {started}</span> : null}
                        {intern.hasReviewed ? (
                          <span className="rounded-full bg-success/10 px-2 py-0.5 text-success">
                            Отзыв отправлен
                          </span>
                        ) : null}
                      </div>

                      {intern.status === "COMPLETED" && intern.employerRating != null ? (
                        <p className="text-xs text-muted-foreground">
                          Оценка работодателя:{" "}
                          <span className="font-semibold text-foreground">
                            {intern.employerRating}/5
                          </span>
                        </p>
                      ) : null}

                      <p className="mt-auto text-xs font-medium text-accent opacity-0 transition-opacity group-hover:opacity-100">
                        Открыть трекер →
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
