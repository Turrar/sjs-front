"use client";

import { useEffect, useState } from "react";
import { routes } from "@/lib/api-routes";
import { ApiError } from "@/lib/api-base";
import { RoleGuard } from "@/components/role-guard";
import { useSession } from "@/components/providers/session-provider";
import type { PlatformAnalytics } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { LoadingHint, PageContainer, PageHeader } from "@/components/layout/page";

const roleColor: Record<string, string> = {
  STUDENT:  "bg-accent",
  EMPLOYER: "bg-amber-400",
  ADMIN:    "bg-violet-500",
};

type HhResult = { imported: number; skipped: number } | null;

export default function AdminAnalyticsPage() {
  const { api } = useSession();
  const [data, setData] = useState<PlatformAnalytics | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [aiHealth, setAiHealth] = useState<unknown>(null);
  const [aiHealthError, setAiHealthError] = useState<string | null>(null);

  // HH import
  const [hhText, setHhText] = useState("");
  const [hhArea, setHhArea] = useState("160");
  const [hhLoading, setHhLoading] = useState(false);
  const [hhResult, setHhResult] = useState<HhResult>(null);
  const [hhError, setHhError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await api.get<PlatformAnalytics>(routes.analytics.platform);
        if (!cancelled) setData(res);
      } catch (e) {
        if (!cancelled) setError(e instanceof ApiError ? e.message : "Ошибка загрузки");
      }
    })();
    return () => { cancelled = true; };
  }, [api]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const h = await api.get<unknown>(routes.ai.health);
        if (!cancelled) { setAiHealth(h); setAiHealthError(null); }
      } catch (e) {
        if (!cancelled)
          setAiHealthError(e instanceof ApiError ? e.message : "Недоступно");
      }
    })();
    return () => { cancelled = true; };
  }, [api]);

  async function runHhImport() {
    setHhLoading(true);
    setHhError(null);
    setHhResult(null);
    try {
      const res = await api.post<HhResult>(
        routes.admin.hhImport(hhText.trim() || undefined, hhArea.trim() || undefined),
        {},
      );
      setHhResult(res);
    } catch (e) {
      setHhError(e instanceof ApiError ? e.message : "Ошибка импорта");
    } finally {
      setHhLoading(false);
    }
  }

  const totalUsers =
    data?.usersByRole.reduce((sum, r) => sum + Number(r.count), 0) ?? 0;

  return (
    <RoleGuard allow={["ADMIN"]}>
      <PageContainer>
        <PageHeader
          title="Аналитика платформы"
          description="Агрегированные показатели по пользователям, вакансиям и откликам."
        />

        {error && (
          <p className="mb-6 rounded-xl border border-danger/30 bg-danger/5 px-4 py-3 text-sm text-danger">
            {error}
          </p>
        )}

        {data ? (
          <>
            {/* KPI row */}
            <div className="grid gap-4 sm:grid-cols-3">
              <Card>
                <CardDescription>Всего пользователей</CardDescription>
                <p className="mt-3 text-4xl font-bold tabular-nums text-foreground">
                  {totalUsers}
                </p>
              </Card>
              <Card>
                <CardDescription>Опубликованные вакансии</CardDescription>
                <p className="mt-3 text-4xl font-bold tabular-nums text-foreground">
                  {data.publishedJobs}
                </p>
              </Card>
              <Card>
                <CardDescription>Всего откликов</CardDescription>
                <p className="mt-3 text-4xl font-bold tabular-nums text-foreground">
                  {data.totalApplications}
                </p>
              </Card>
            </div>

            {/* Users by role — bar chart */}
            <Card className="mt-6">
              <CardTitle as="h2" className="mb-4">Пользователи по ролям</CardTitle>
              <div className="space-y-4">
                {data.usersByRole.map((row) => {
                  const count = Number(row.count);
                  const pct = totalUsers > 0 ? (count / totalUsers) * 100 : 0;
                  const barColor = roleColor[row.role] ?? "bg-muted-foreground";
                  return (
                    <div key={row.role} className="flex items-center gap-4">
                      <span className="w-24 shrink-0 text-sm font-medium text-foreground">
                        {row.role}
                      </span>
                      <div className="flex flex-1 items-center gap-3">
                        <div className="h-6 flex-1 overflow-hidden rounded-full bg-muted">
                          <div
                            className={`h-full rounded-full transition-all ${barColor}`}
                            style={{ width: `${Math.max(pct, 2)}%` }}
                          />
                        </div>
                        <span className="w-12 text-right tabular-nums text-sm font-semibold text-foreground">
                          {count}
                        </span>
                        <span className="w-10 text-right tabular-nums text-xs text-muted-foreground">
                          {pct.toFixed(0)}%
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </Card>
          </>
        ) : !error ? (
          <LoadingHint />
        ) : null}

        {/* HH Import */}
        <Card className="mt-6">
          <CardTitle as="h2" className="mb-1">Импорт с HeadHunter</CardTitle>
          <CardDescription className="mb-5">
            POST /admin/hh-import — парсит вакансии с api.hh.ru и сохраняет как PUBLISHED.
            Требует HH_IMPORT_ENABLED=true в env.
          </CardDescription>
          <div className="grid gap-4 sm:grid-cols-2">
            <Input
              label='Поисковый запрос (по умолчанию «стажировка»)'
              value={hhText}
              onChange={(e) => setHhText(e.target.value)}
              placeholder="стажировка OR internship"
            />
            <Input
              label="Код региона HH (160 = Казахстан, 2019 = Алматы)"
              value={hhArea}
              onChange={(e) => setHhArea(e.target.value)}
              placeholder="160"
            />
          </div>
          <div className="mt-4 flex flex-wrap items-center gap-4">
            <Button onClick={() => void runHhImport()} disabled={hhLoading}>
              {hhLoading ? "Импорт…" : "Запустить импорт"}
            </Button>
            {hhResult && (
              <span className="rounded-xl bg-success/10 px-4 py-2 text-sm font-medium text-success">
                Импортировано: {hhResult.imported} · Пропущено: {hhResult.skipped}
              </span>
            )}
            {hhError && (
              <span className="text-sm text-danger">{hhError}</span>
            )}
          </div>
        </Card>

        {/* AI Health */}
        <Card className="mt-6">
          <CardTitle as="h2" className="mb-1">AI сервис</CardTitle>
          <CardDescription className="mb-3">GET /ai/health — статус конфигурации AI-модуля.</CardDescription>
          {aiHealthError ? (
            <p className="rounded-xl bg-danger/5 px-3 py-2 text-sm text-danger">{aiHealthError}</p>
          ) : (
            <pre className="max-h-48 overflow-auto rounded-xl bg-muted/60 p-3 font-mono text-xs leading-relaxed">
              {aiHealth !== null ? JSON.stringify(aiHealth, null, 2) : "…"}
            </pre>
          )}
        </Card>
      </PageContainer>
    </RoleGuard>
  );
}
