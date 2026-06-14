"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { routes } from "@/lib/api-routes";
import { ApiError } from "@/lib/api-base";
import { RoleGuard } from "@/components/role-guard";
import { useSession } from "@/components/providers/session-provider";
import type { SkillBadge, SkillTest, SkillTestResult } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import {
  EmptyState,
  PageContainer,
  PageHeader,
} from "@/components/layout/page";
import { SimpleListSkeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/cn";

function scoreColor(score: number) {
  if (score >= 80) return "text-success";
  if (score >= 60) return "text-accent";
  return "text-danger";
}

function BadgeItem({ badge }: { badge: SkillBadge }) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-border bg-card px-3 py-2.5 shadow-sm">
      <div
        className={cn(
          "flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-bold tabular-nums",
          badge.scorePercent >= 80
            ? "bg-success/15 text-success"
            : badge.scorePercent >= 60
              ? "bg-accent/15 text-accent"
              : "bg-danger/10 text-danger",
        )}
      >
        {badge.scorePercent}
      </div>
      <div className="min-w-0">
        <p className="truncate text-sm font-semibold text-foreground">
          {badge.skill}
        </p>
        <p className="text-xs text-muted-foreground">Бейдж получен</p>
      </div>
    </div>
  );
}

export default function SkillTestsPage() {
  const { api } = useSession();
  const [tests, setTests] = useState<SkillTest[]>([]);
  const [badges, setBadges] = useState<SkillBadge[]>([]);
  const [results, setResults] = useState<SkillTestResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [partialWarning, setPartialWarning] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    setPartialWarning(null);
    try {
      const testsData = await api.get<SkillTest[]>(routes.skillTests.list);
      let badgesFailed = false;
      let resultsFailed = false;
      const badgesData = await api
        .get<SkillBadge[]>(routes.skillTests.badgesMe)
        .catch(() => {
          badgesFailed = true;
          return [] as SkillBadge[];
        });
      const resultsData = await api
        .get<SkillTestResult[]>(routes.skillTests.resultsMe)
        .catch(() => {
          resultsFailed = true;
          return [] as SkillTestResult[];
        });
      setTests(testsData);
      setBadges(badgesData);
      setResults(resultsData);
      if (badgesFailed || resultsFailed) {
        setPartialWarning(
          "Часть данных не загрузилась — бейджи или история результатов могут быть неполными.",
        );
      }
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
          title="Тесты навыков"
          description="Пройдите тест — получите верифицированный бейдж на своём публичном профиле."
        />

        {partialWarning ? (
          <p className="mb-6 rounded-xl border border-amber-500/30 bg-amber-500/5 px-4 py-3 text-sm text-amber-800">
            {partialWarning}
          </p>
        ) : null}

        {error ? (
          <p className="mb-6 rounded-xl border border-danger/30 bg-danger/5 px-4 py-3 text-sm text-danger">
            {error}
          </p>
        ) : null}

        {loading ? (
          <SimpleListSkeleton count={5} />
        ) : (
          <>
            {/* Badges */}
            {badges.length > 0 ? (
              <section className="mb-8">
                <h2 className="mb-3 text-sm font-semibold text-foreground">
                  Мои бейджи
                </h2>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                  {badges.map((b) => (
                    <BadgeItem key={b.id} badge={b} />
                  ))}
                </div>
              </section>
            ) : null}

            {/* Tests catalog */}
            {tests.length === 0 ? (
              <EmptyState
                title="Нет доступных тестов"
                description="Тесты появятся здесь после добавления их администратором."
              />
            ) : (
              <section className="mb-8">
                <h2 className="mb-3 text-sm font-semibold text-foreground">
                  Каталог тестов
                </h2>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {tests.map((test) => {
                    const myBadge = badges.find((b) => b.testId === test.id);
                    const myResult = results
                      .filter((r) => r.testId === test.id)
                      .sort(
                        (a, b) =>
                          new Date(b.createdAt).getTime() -
                          new Date(a.createdAt).getTime(),
                      )[0];
                    return (
                      <Card key={test.id} className="flex flex-col gap-3">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <CardTitle className="text-base">
                              {test.skill}
                            </CardTitle>
                            {test.description ? (
                              <CardDescription className="mt-1 line-clamp-2">
                                {test.description}
                              </CardDescription>
                            ) : null}
                          </div>
                          {myBadge ? (
                            <span
                              className={cn(
                                "shrink-0 rounded-full px-2.5 py-1 text-xs font-bold tabular-nums",
                                scoreColor(myBadge.scorePercent) === "text-success"
                                  ? "bg-success/10 text-success"
                                  : scoreColor(myBadge.scorePercent) === "text-accent"
                                    ? "bg-accent/10 text-accent"
                                    : "bg-danger/10 text-danger",
                              )}
                            >
                              {myBadge.scorePercent}%
                            </span>
                          ) : null}
                        </div>
                        <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                          <span className="rounded-md bg-muted/60 px-2 py-0.5">
                            Порог: {test.passThreshold}%
                          </span>
                          {myResult ? (
                            <span
                              className={cn(
                                "rounded-md px-2 py-0.5 font-medium",
                                myResult.passed
                                  ? "bg-success/10 text-success"
                                  : "bg-danger/10 text-danger",
                              )}
                            >
                              Лучший: {myResult.scorePercent}%
                            </span>
                          ) : null}
                        </div>
                        <div className="mt-auto">
                          <Link href={`/skill-tests/${test.id}`}>
                            <Button
                              variant={myBadge ? "secondary" : "primary"}
                              className="w-full"
                            >
                              {myBadge ? "Пройти повторно" : "Начать тест"}
                            </Button>
                          </Link>
                        </div>
                      </Card>
                    );
                  })}
                </div>
              </section>
            )}

            {/* Attempt history */}
            {results.length > 0 ? (
              <section>
                <h2 className="mb-3 text-sm font-semibold text-foreground">
                  История попыток
                </h2>
                <Card padding={false}>
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[28rem] border-collapse text-sm">
                      <thead>
                        <tr className="border-b border-border bg-muted/40 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                          <th className="px-4 py-2.5 text-left">Навык</th>
                          <th className="px-4 py-2.5 text-right">Результат</th>
                          <th className="px-4 py-2.5 text-center">Статус</th>
                          <th className="px-4 py-2.5 text-left">Дата</th>
                        </tr>
                      </thead>
                      <tbody>
                        {results
                          .sort(
                            (a, b) =>
                              new Date(b.createdAt).getTime() -
                              new Date(a.createdAt).getTime(),
                          )
                          .map((r) => (
                            <tr
                              key={r.id}
                              className="border-b border-border/60 last:border-0"
                            >
                              <td className="px-4 py-3 font-medium text-foreground">
                                {r.test?.skill ?? r.testId}
                              </td>
                              <td
                                className={cn(
                                  "px-4 py-3 text-right font-bold tabular-nums",
                                  scoreColor(r.scorePercent),
                                )}
                              >
                                {r.scorePercent}%
                              </td>
                              <td className="px-4 py-3 text-center">
                                <span
                                  className={cn(
                                    "inline-flex rounded-full px-2 py-0.5 text-xs font-medium",
                                    r.passed
                                      ? "bg-success/10 text-success"
                                      : "bg-danger/10 text-danger",
                                  )}
                                >
                                  {r.passed ? "Сдан" : "Не сдан"}
                                </span>
                              </td>
                              <td className="px-4 py-3 text-muted-foreground">
                                {new Date(r.createdAt).toLocaleDateString()}
                              </td>
                            </tr>
                          ))}
                      </tbody>
                    </table>
                  </div>
                </Card>
              </section>
            ) : null}
          </>
        )}
      </PageContainer>
    </RoleGuard>
  );
}
