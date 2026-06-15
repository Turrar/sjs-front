"use client";

import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { routes } from "@/lib/api-routes";
import { ApiError } from "@/lib/api-base";
import { RoleGuard } from "@/components/role-guard";
import { useSession } from "@/components/providers/session-provider";
import type {
  Application,
  ApplicationStatus,
  Internship,
  InterviewPrepResponse,
  SkillBadge,
} from "@/lib/types";
import { EmployerVideoInterview } from "@/components/applications/video-interview-actions";
import { ApplicationResumeCard } from "@/components/applications/application-resume-card";
import { Button } from "@/components/ui/button";
import { Card, CardTitle } from "@/components/ui/card";
import {
  applicationStatusOrder,
  getStatusStyle,
  employerScoreRingClass,
  isTerminalApplicationStatus,
} from "@/lib/application-display";
import {
  getEmployerStatusSelectOptions,
  isEmployerPipelineStepClickable,
  transitionErrorMessage,
} from "@/lib/application-status-fsm";
import { interviewPrepPath } from "@/lib/kaspi-payment";
import { selectClass } from "@/lib/select-class";
import { cn } from "@/lib/cn";
import { PageContainer, PageHeader } from "@/components/layout/page";
import { DetailPageSkeleton } from "@/components/ui/skeleton";

export default function EmployerApplicationDetailPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const appId = params.id as string;
  const jobIdFromQuery = searchParams.get("jobId");
  const { api } = useSession();

  const [app, setApp] = useState<Application | null>(null);
  const [badges, setBadges] = useState<SkillBadge[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusUpdating, setStatusUpdating] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiQuestions, setAiQuestions] = useState<string[] | null>(null);
  const [internshipLoading, setInternshipLoading] = useState(false);

  const [actionError, setActionError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const found = await api.get<Application>(routes.applications.byId(appId));
      setApp(found);
      try {
        const b = await api.get<SkillBadge[]>(
          routes.skillTests.badgesByUser(found.studentUserId),
        );
        setBadges(b);
      } catch {
        // badges optional
      }
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Ошибка загрузки");
    } finally {
      setLoading(false);
    }
  }, [api, appId]);

  useEffect(() => {
    void load();
  }, [load]);

  async function updateStatus(status: ApplicationStatus) {
    if (!app) return;
    setStatusUpdating(true);
    setActionError(null);
    try {
      await api.patch<Application>(routes.applications.patchStatus(app.id), { status });
      setApp((prev) => prev ? { ...prev, status } : prev);
    } catch (e) {
      const status = e instanceof ApiError ? e.status : undefined;
      setActionError(
        e instanceof ApiError ? (status === 400 ? transitionErrorMessage(400) : e.message) : transitionErrorMessage(),
      );
    } finally {
      setStatusUpdating(false);
    }
  }

  async function loadInterviewPrep() {
    if (!app?.jobId) return;
    setAiLoading(true);
    setActionError(null);
    try {
      const res = await api.get<InterviewPrepResponse>(
        interviewPrepPath({ jobId: app.jobId, language: "ru", count: 7 }),
      );
      setAiQuestions(res.questions);
    } catch (e) {
      const msg =
        e instanceof ApiError && e.status === 403
          ? "Подготовка к интервью доступна только для опубликованных вакансий."
          : e instanceof ApiError
            ? e.message
            : "Сервис AI временно недоступен";
      setActionError(msg);
    } finally {
      setAiLoading(false);
    }
  }

  async function createInternship() {
    if (!app) return;
    setInternshipLoading(true);
    setActionError(null);
    try {
      const res = await api.post<Internship>(routes.internships.open, {
        applicationId: app.id,
      });
      router.push(`/employer/internships/${res.id}`);
    } catch (e) {
      setActionError(e instanceof ApiError ? e.message : "Не удалось создать стажировку");
    } finally {
      setInternshipLoading(false);
    }
  }

  if (loading) {
    return (
      <RoleGuard allow={["EMPLOYER"]}>
        <PageContainer>
          <DetailPageSkeleton />
        </PageContainer>
      </RoleGuard>
    );
  }

  if (error || !app) {
    return (
      <RoleGuard allow={["EMPLOYER"]}>
        <PageContainer>
          <p className="rounded-xl border border-danger/30 bg-danger/5 px-4 py-3 text-sm text-danger">
            {error ?? "Отклик не найден"}
          </p>
        </PageContainer>
      </RoleGuard>
    );
  }

  const profile = app.studentProfile as {
    firstName?: string;
    lastName?: string;
    university?: string;
    specialty?: string;
  } | null | undefined;
  const fullName = [profile?.firstName, profile?.lastName].filter(Boolean).join(" ");
  const pipelineIdx = applicationStatusOrder.indexOf(
    app.status as (typeof applicationStatusOrder)[number],
  );
  const statusSelectOptions = getEmployerStatusSelectOptions(app.status);

  const backJobId = app?.jobId ?? jobIdFromQuery;

  return (
    <RoleGuard allow={["EMPLOYER"]}>
      <PageContainer>
        <div className="mb-6 flex flex-wrap gap-3 text-sm">
          {backJobId ? (
            <Link
              href={`/employer/jobs/${backJobId}/applications`}
              className="font-medium text-muted-foreground transition-colors hover:text-accent"
            >
              ← Все отклики
            </Link>
          ) : (
            <Link
              href="/employer/jobs"
              className="font-medium text-muted-foreground transition-colors hover:text-accent"
            >
              ← Мои вакансии
            </Link>
          )}
        </div>

        <PageHeader
          title={`Отклик: ${fullName || app.student?.email || app.studentUserId}`}
          description={app.job?.title ? `Вакансия: ${app.job.title}` : undefined}
        />

        {actionError ? (
          <p className="mb-5 rounded-xl border border-danger/30 bg-danger/5 px-4 py-3 text-sm text-danger">
            {actionError}
          </p>
        ) : null}

        {/* Status pipeline */}
        <Card className="mb-5">
          <CardTitle as="h2" className="mb-4">Воронка найма</CardTitle>
          <div className="flex flex-wrap gap-2">
            {isTerminalApplicationStatus(app.status) ? (
              <span
                className={cn(
                  "rounded-full px-3 py-1 text-xs font-medium ring-2 ring-offset-1 ring-accent/40",
                  getStatusStyle(app.status).className,
                )}
              >
                {getStatusStyle(app.status).label}
              </span>
            ) : (
              <>
                {applicationStatusOrder.map((s, i) => {
                  const st = getStatusStyle(s);
                  const isActive = app.status === s;
                  const isPast = pipelineIdx !== -1 && i < pipelineIdx;
                  const clickable = isEmployerPipelineStepClickable(
                    app.status,
                    s,
                    i,
                    pipelineIdx,
                  );
                  return (
                    <button
                      key={s}
                      type="button"
                      disabled={statusUpdating || !clickable}
                      onClick={() => void updateStatus(s)}
                      className={cn(
                        "rounded-full px-3 py-1 text-xs font-medium transition-colors",
                        isActive
                          ? cn(st.className, "ring-2 ring-offset-1 ring-accent/40")
                          : isPast
                            ? "bg-success/10 text-success opacity-80"
                            : clickable
                              ? "bg-muted text-muted-foreground hover:bg-muted/80"
                              : "cursor-not-allowed bg-muted/50 text-muted-foreground/60",
                      )}
                    >
                      {st.label}
                    </button>
                  );
                })}
                <button
                  type="button"
                  disabled={
                    statusUpdating ||
                    !isEmployerPipelineStepClickable(
                      app.status,
                      "REJECTED",
                      -1,
                      pipelineIdx,
                    )
                  }
                  onClick={() => void updateStatus("REJECTED")}
                  className={cn(
                    "rounded-full px-3 py-1 text-xs font-medium transition-colors",
                    app.status === "REJECTED"
                      ? cn(getStatusStyle("REJECTED").className, "ring-2 ring-offset-1 ring-accent/40")
                      : "bg-muted text-muted-foreground hover:bg-danger/10 hover:text-danger",
                  )}
                >
                  {getStatusStyle("REJECTED").label}
                </button>
              </>
            )}
          </div>
          <div className="mt-4 flex items-center gap-3">
            <span className="text-sm font-medium text-muted-foreground">Быстрая смена:</span>
            <select
              className={selectClass}
              value={app.status}
              disabled={statusUpdating}
              onChange={(e) => void updateStatus(e.target.value as ApplicationStatus)}
            >
              {statusSelectOptions.map((s) => (
                <option key={s} value={s}>{getStatusStyle(s).label}</option>
              ))}
            </select>
          </div>
        </Card>

        <div className="grid gap-5 lg:grid-cols-2">
          {/* Candidate card */}
          <Card>
            <CardTitle as="h2" className="mb-4">Кандидат</CardTitle>
            <div className="space-y-2 text-sm">
              {fullName && (
                <p>
                  <span className="text-muted-foreground">Имя:</span>{" "}
                  <span className="font-medium text-foreground">{fullName}</span>
                </p>
              )}
              <p>
                <span className="text-muted-foreground">Email:</span>{" "}
                <span className="font-medium text-foreground">{app.student?.email ?? app.studentUserId}</span>
              </p>
              {profile?.university && (
                <p>
                  <span className="text-muted-foreground">Вуз:</span>{" "}
                  <span className="font-medium text-foreground">{profile.university}</span>
                </p>
              )}
              {profile?.specialty && (
                <p>
                  <span className="text-muted-foreground">Специальность:</span>{" "}
                  <span className="font-medium text-foreground">{profile.specialty}</span>
                </p>
              )}
              <Link
                href={`/profiles/${app.studentUserId}`}
                target="_blank"
                className="mt-2 inline-block text-accent hover:underline"
              >
                Открыть полный профиль ↗
              </Link>
            </div>
          </Card>

          {/* AI Score */}
          <Card>
            <CardTitle as="h2" className="mb-4">AI-оценка</CardTitle>
            {app.employerScore != null ? (
              <div className="flex items-center gap-4">
                <div
                  className={cn(
                    "flex h-20 w-20 flex-shrink-0 items-center justify-center rounded-full text-2xl font-bold tabular-nums",
                    employerScoreRingClass(app.employerScore),
                  )}
                >
                  {app.employerScore}
                </div>
                <div className="text-sm text-muted-foreground">
                  <p>Балл соответствия кандидата вакансии, рассчитан автоматически.</p>
                  <p className="mt-1">
                    {app.employerScore >= 70
                      ? "Высокий — рекомендуется к интервью."
                      : app.employerScore >= 40
                        ? "Средний — стоит рассмотреть."
                        : "Низкий — слабое соответствие."}
                  </p>
                </div>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Оценка ещё не рассчитана.</p>
            )}
          </Card>
        </div>

        {/* Skill badges */}
        {badges.length > 0 && (
          <Card className="mt-5">
            <CardTitle as="h2" className="mb-3">Навыки кандидата</CardTitle>
            <div className="flex flex-wrap gap-2">
              {badges.map((b) => (
                <span
                  key={b.id}
                  className="flex items-center gap-1.5 rounded-full bg-accent/10 px-3 py-1 text-xs font-medium text-accent"
                >
                  <span>★</span>
                  {b.skill}
                  <span className="opacity-70">({b.scorePercent}%)</span>
                </span>
              ))}
            </div>
          </Card>
        )}

        {/* Resume snapshot */}
        {app.resume ? (
          <Card className="mt-5">
            <CardTitle as="h2" className="mb-3">Резюме кандидата</CardTitle>
            <ApplicationResumeCard resume={app.resume} />
          </Card>
        ) : null}

        {/* Cover letter */}
        {app.coverLetter && (
          <Card className="mt-5">
            <CardTitle as="h2" className="mb-3">Сопроводительное письмо</CardTitle>
            <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground">
              {app.coverLetter}
            </p>
          </Card>
        )}

        {/* AI interview prep */}
        <Card className="mt-5">
          <CardTitle as="h2" className="mb-3">AI: Вопросы для интервью</CardTitle>
          {aiQuestions ? (
            <ol className="list-decimal space-y-2 pl-5 text-sm">
              {aiQuestions.map((q, i) => (
                <li key={i}>{q}</li>
              ))}
            </ol>
          ) : (
            <>
              <Button
                variant="secondary"
                onClick={() => void loadInterviewPrep()}
                disabled={aiLoading}
              >
                {aiLoading ? "Загрузка…" : "Сгенерировать вопросы"}
              </Button>
              {app.job?.status && app.job.status !== "PUBLISHED" ? (
                <p className="mt-2 text-xs text-muted-foreground">
                  Для черновиков вопросы доступны только владельцу вакансии (через этот кабинет).
                </p>
              ) : null}
            </>
          )}
        </Card>

        {/* Actions */}
        <div className="mt-6 flex flex-wrap items-start gap-3">
          <Link href={`/applications/${appId}/chat`}>
            <Button variant="secondary">Открыть чат</Button>
          </Link>
          <EmployerVideoInterview applicationId={appId} status={app.status} />
          {app.status === "OFFER" || app.status === "HIRED" ? (
            <Button
              onClick={() => void createInternship()}
              disabled={internshipLoading}
            >
              {internshipLoading ? "Создание…" : "Открыть трекер стажировки"}
            </Button>
          ) : null}
        </div>
      </PageContainer>
    </RoleGuard>
  );
}
