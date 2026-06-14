"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { routes } from "@/lib/api-routes";
import { ApiError } from "@/lib/api-base";
import { RoleGuard } from "@/components/role-guard";
import { useSession } from "@/components/providers/session-provider";
import type { EmployerAnalytics, EmployerProfile } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { PageContainer, PageHeader } from "@/components/layout/page";
import { StatsGridSkeleton } from "@/components/ui/skeleton";

import { verificationStatusBadge } from "@/lib/employer-display";

export default function EmployerAnalyticsPage() {
  const { api, user } = useSession();
  const [data, setData] = useState<EmployerAnalytics | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const res = await api.get<EmployerAnalytics>(routes.analytics.employerMe);
        if (!cancelled) setData(res);
      } catch (e) {
        if (!cancelled)
          setError(e instanceof ApiError ? e.message : "Ошибка загрузки");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [api]);

  const profile = user?.profile as EmployerProfile | null | undefined;
  const vStatus = profile?.verificationStatus ?? "PENDING";
  const badge = verificationStatusBadge(vStatus);

  return (
    <RoleGuard allow={["EMPLOYER"]}>
      <PageContainer>
        <PageHeader
          title="Аналитика"
          description="Сводка по вашим вакансиям и откликам."
        />

        {/* Verification status banner */}
        {vStatus !== "VERIFIED" && (
          <div className={`mb-6 flex items-center gap-3 rounded-xl border px-4 py-3 text-sm ${badge.className} ${badge.borderClass ?? ""}`}>
            <span className="font-medium">{badge.label}</span>
            {vStatus === "PENDING" && (
              <span>— ваша компания ожидает верификации администратором. Вакансии будут видны после подтверждения.</span>
            )}
            {vStatus === "REJECTED" && (
              <span>— ваша компания была отклонена. Обратитесь к администратору.</span>
            )}
          </div>
        )}
        {vStatus === "VERIFIED" && (
          <div className={`mb-6 flex items-center gap-2 rounded-xl border px-4 py-2.5 text-sm ${badge.className} ${badge.borderClass ?? ""}`}>
            <span>✓</span>
            <span className="font-medium">{badge.label}</span>
          </div>
        )}

        {error ? (
          <div className="mb-6 space-y-3">
            <p className="rounded-xl border border-danger/30 bg-danger/5 px-4 py-3 text-sm text-danger">
              {error}
            </p>
            <Button type="button" variant="secondary" onClick={() => window.location.reload()}>
              Повторить
            </Button>
          </div>
        ) : null}

        {loading ? (
          <StatsGridSkeleton count={4} />
        ) : data ? (
          <div className="grid gap-5 sm:grid-cols-2">
            <Card>
              <CardTitle as="h2">Вакансии</CardTitle>
              <CardDescription>Всего создано</CardDescription>
              <p className="mt-4 text-4xl font-semibold tabular-nums tracking-tight text-foreground">
                {data.jobs}
              </p>
            </Card>
            <Card>
              <CardTitle as="h2">Отклики</CardTitle>
              <CardDescription>По всем вакансиям</CardDescription>
              <p className="mt-4 text-4xl font-semibold tabular-nums tracking-tight text-foreground">
                {data.applications}
              </p>
            </Card>
          </div>
        ) : null}

        {/* Quick actions */}
        <div className="mt-8">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Быстрые действия
          </h2>
          <div className="flex flex-wrap gap-3">
            <Link href="/employer/jobs/new">
              <Button>Новая вакансия</Button>
            </Link>
            <Link href="/employer/jobs">
              <Button variant="secondary">Мои вакансии</Button>
            </Link>
            <Link href="/employer/internships">
              <Button variant="secondary">Стажировки</Button>
            </Link>
          </div>
        </div>
      </PageContainer>
    </RoleGuard>
  );
}
