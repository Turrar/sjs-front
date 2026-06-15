"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { useSession } from "@/components/providers/session-provider";
import { routes } from "@/lib/api-routes";
import { fetchPublic } from "@/lib/session-api";
import type { Job, PublicEmployerProfile } from "@/lib/types";
import {
  canStudentApplyToJob,
  categoryTreeLabel,
  jobLocationLine,
  salaryLine,
} from "@/lib/job-display";
import { getStatusStyle } from "@/lib/application-display";
import { employerRatingLine } from "@/lib/employer-profile-display";
import { verificationStatusBadge } from "@/lib/employer-display";
import { JobDescriptionView } from "@/components/job-description-view";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { PremiumBadge } from "@/components/ui/premium-badge";
import { JobApplyPanel } from "@/components/jobs/job-apply-panel";
import { PageContainer } from "@/components/layout/page";
import { DetailPageSkeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/cn";

type JobDetailContentProps = {
  /** Куда вести «Все вакансии»: `/jobs` или `/dashboard/jobs` */
  jobsListHref: string;
};

function JobMetric({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-xl border border-border/60 bg-muted/25 px-3 py-2.5">
      <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <p className="mt-0.5 text-sm font-medium text-foreground">{value}</p>
    </div>
  );
}

function EmployerStrip({
  profile,
  employerUserId,
}: {
  profile: PublicEmployerProfile;
  employerUserId: string;
}) {
  const badge = verificationStatusBadge(profile.verificationStatus);

  return (
    <div className="flex items-start gap-3">
      {profile.logoUrl ? (
        <img
          src={profile.logoUrl}
          alt=""
          className="h-12 w-12 shrink-0 rounded-xl border border-border object-cover"
        />
      ) : (
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-dashed border-border bg-muted/30 text-xs text-muted-foreground">
          —
        </div>
      )}
      <div className="min-w-0 flex-1 space-y-1">
        <div className="flex flex-wrap items-center gap-2">
          <Link
            href={`/employers/${employerUserId}`}
            className="font-semibold text-foreground hover:text-accent hover:underline"
          >
            {profile.companyName}
          </Link>
          <span
            className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${badge.className}`}
          >
            {badge.label}
          </span>
        </div>
        <p className="text-sm text-muted-foreground">
          {employerRatingLine(profile.avgRating, profile.reviewCount)}
        </p>
        {profile.reviewCount > 0 ? (
          <Link
            href={`/employers/${employerUserId}/reviews`}
            className="inline-block text-sm font-medium text-accent hover:underline"
          >
            Отзывы о компании →
          </Link>
        ) : null}
      </div>
    </div>
  );
}

export function JobDetailContent({ jobsListHref }: JobDetailContentProps) {
  const params = useParams();
  const id = params.id as string;
  const { user, accessToken } = useSession();
  const [job, setJob] = useState<Job | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [employerProfile, setEmployerProfile] = useState<PublicEmployerProfile | null>(null);

  const inCabinet = jobsListHref.startsWith("/dashboard");
  const loginReturnPath = `${jobsListHref.replace(/\/$/, "")}/${id}`;

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const j = await fetchPublic<Job>(
          routes.jobs.byId(id),
          { method: "GET" },
          accessToken ?? undefined,
        );
        if (!cancelled) setJob(j);
      } catch (e) {
        if (!cancelled)
          setError(e instanceof Error ? e.message : "Ошибка загрузки");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id, accessToken]);

  useEffect(() => {
    if (!job?.employerUserId) {
      setEmployerProfile(null);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const profile = await fetchPublic<PublicEmployerProfile>(
          routes.profiles.employer(job.employerUserId!),
          { method: "GET" },
          accessToken ?? undefined,
        );
        if (!cancelled) setEmployerProfile(profile);
      } catch {
        if (!cancelled) setEmployerProfile(null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [job?.employerUserId, accessToken]);

  const pageClass = cn(
    inCabinet ? "max-w-4xl py-6 md:py-8" : "narrow py-8 md:py-10",
  );

  if (loading) {
    return (
      <PageContainer className={pageClass}>
        <DetailPageSkeleton />
      </PageContainer>
    );
  }

  if (error || !job) {
    return (
      <PageContainer className={pageClass}>
        <Card className="border-danger/20 bg-danger/5">
          <p className="text-sm text-danger">{error ?? "Вакансия не найдена"}</p>
          <Link
            href={jobsListHref}
            className="mt-4 inline-flex text-sm font-medium text-accent underline-offset-4 hover:underline"
          >
            ← К списку вакансий
          </Link>
        </Card>
      </PageContainer>
    );
  }

  const canApply = canStudentApplyToJob(job, user?.role);
  const hasApplied = user?.role === "STUDENT" && job.hasApplied === true;
  const applicationStatusStyle =
    job.applicationStatus != null ? getStatusStyle(job.applicationStatus) : null;
  const locationLine = jobLocationLine(job);
  const salary = salaryLine(job);
  const categoryLabels =
    job.categories?.map((c) => categoryTreeLabel(c, job.categories ?? [])) ?? [];

  const applyPanel = canApply ? (
    <JobApplyPanel job={job} jobId={id} loginReturnPath={loginReturnPath} />
  ) : hasApplied ? (
    <Card className="space-y-3">
      <div>
        <h2 className="text-base font-semibold text-foreground">Отклик отправлен</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Вы уже откликались на эту вакансию.
        </p>
      </div>
      {applicationStatusStyle ? (
        <span
          className={cn(
            "inline-flex rounded-full px-3 py-1 text-xs font-medium",
            applicationStatusStyle.className,
          )}
        >
          {applicationStatusStyle.label}
        </span>
      ) : null}
      {job.applicationId ? (
        <Link
          href={`/applications/${job.applicationId}`}
          className="inline-flex text-sm font-medium text-accent underline-offset-4 hover:underline"
        >
          Мой отклик →
        </Link>
      ) : null}
      <Link
        href="/applications"
        className="inline-flex text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
      >
        Все отклики
      </Link>
    </Card>
  ) : user?.role !== "STUDENT" ? (
    <Card>
      <p className="text-sm text-muted-foreground">
        Отклик доступен для аккаунта студента.
      </p>
    </Card>
  ) : job.status !== "PUBLISHED" ? (
    <Card>
      <p className="text-sm text-muted-foreground">
        Вакансия недоступна для отклика — набор закрыт или приостановлен.
      </p>
    </Card>
  ) : null;

  return (
    <PageContainer className={pageClass}>
      <Link
        href={jobsListHref}
        className="mb-5 inline-flex items-center gap-2 text-sm font-medium text-muted-foreground transition-colors hover:text-accent"
      >
        <span aria-hidden>←</span> Все вакансии
      </Link>

      <Card className="mb-6">
        <div className="space-y-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <h1 className="text-2xl font-semibold tracking-tight text-foreground sm:text-[1.65rem]">
              {job.title}
            </h1>
            {job.isPremium ? <PremiumBadge className="shrink-0" /> : null}
          </div>

          <div className="grid gap-2 sm:grid-cols-3">
            <JobMetric
              label="Зарплата"
              value={salary ?? "По договорённости"}
            />
            <JobMetric
              label="Локация"
              value={locationLine ?? "Не указана"}
            />
            <JobMetric
              label="Часов в неделю"
              value={
                job.requiredWeeklyHours != null
                  ? String(job.requiredWeeklyHours)
                  : "Не указано"
              }
            />
          </div>

          {categoryLabels.length > 0 || (job.tags ?? []).length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {categoryLabels.map((label) => (
                <span
                  key={label}
                  className="rounded-full bg-muted px-2.5 py-0.5 text-xs text-foreground"
                >
                  {label}
                </span>
              ))}
              {(job.tags ?? []).map((t) => (
                <span
                  key={t.id}
                  className="rounded-full border border-border/80 px-2.5 py-0.5 text-xs text-muted-foreground"
                >
                  {t.name}
                </span>
              ))}
            </div>
          ) : null}
        </div>
      </Card>

      <div
        className={cn(
          "grid gap-6",
          inCabinet && applyPanel ? "lg:grid-cols-[minmax(0,1fr)_280px]" : "",
        )}
      >
        <div className="min-w-0 space-y-6">
          <section className="rounded-2xl border border-border/80 bg-card p-5 shadow-sm sm:p-6">
            <h2 className="text-base font-semibold text-foreground">Описание</h2>
            <div className="mt-4">
              <JobDescriptionView description={job.description} />
            </div>
          </section>

          {employerProfile && job.employerUserId ? (
            <section className="rounded-2xl border border-border/80 bg-card p-5 shadow-sm sm:p-6">
              <h2 className="mb-4 text-base font-semibold text-foreground">
                Работодатель
              </h2>
              <EmployerStrip
                profile={employerProfile}
                employerUserId={job.employerUserId}
              />
            </section>
          ) : null}
        </div>

        {inCabinet && applyPanel ? (
          <aside className="lg:sticky lg:top-20 lg:self-start">{applyPanel}</aside>
        ) : null}
      </div>

      {!inCabinet && applyPanel ? (
        <div className="mt-6">{applyPanel}</div>
      ) : null}
    </PageContainer>
  );
}
