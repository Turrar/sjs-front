"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { routes } from "@/lib/api-routes";
import { ApiError } from "@/lib/api-base";
import { RoleGuard } from "@/components/role-guard";
import { useSession } from "@/components/providers/session-provider";
import type {
  Application,
  ApplicationStatus,
  CoverLetterResponse,
  InterviewPrepResponse,
  Job,
} from "@/lib/types";
import { jobLocationLine, salaryLine } from "@/lib/job-display";
import {
  applicationStatusOrder,
  canStudentWithdraw,
  getStatusStyle,
  isTerminalApplicationStatus,
} from "@/lib/application-display";
import { ApplicationResumeCard } from "@/components/applications/application-resume-card";
import { StudentVideoInterview } from "@/components/applications/video-interview-actions";
import { EmployerReviewStatus } from "@/components/reviews/employer-review-modal";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { PageContainer } from "@/components/layout/page";
import { DetailPageSkeleton } from "@/components/ui/skeleton";
import { useToast } from "@/components/providers/toast-provider";
import { interviewPrepPath } from "@/lib/kaspi-payment";
import { cn } from "@/lib/cn";

function JobMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border/60 bg-muted/25 px-3 py-2.5">
      <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <p className="mt-0.5 text-sm font-medium text-foreground">{value}</p>
    </div>
  );
}

function ApplicationStatusStepper({
  status,
}: {
  status: ApplicationStatus;
}) {
  const statusIdx = applicationStatusOrder.indexOf(status);
  const terminal = isTerminalApplicationStatus(status);
  const terminalStyle = getStatusStyle(status);

  if (terminal) {
    return (
      <span
        className={cn(
          "inline-flex rounded-full px-3 py-1.5 text-sm font-medium",
          terminalStyle.className,
        )}
      >
        {terminalStyle.label}
      </span>
    );
  }

  return (
    <ol className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:gap-0">
      {applicationStatusOrder.map((step, i) => {
        const st = getStatusStyle(step);
        const isCurrent = status === step;
        const isPast = statusIdx !== -1 && i < statusIdx;
        const isLast = i === applicationStatusOrder.length - 1;

        return (
          <li key={step} className="flex items-center gap-2 sm:gap-0">
            <div
              className={cn(
                "flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-medium sm:text-sm",
                isCurrent
                  ? cn(st.className, "ring-2 ring-accent/25")
                  : isPast
                    ? "bg-success/10 text-success"
                    : "bg-muted/40 text-muted-foreground",
              )}
            >
              <span
                className={cn(
                  "flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold",
                  isCurrent
                    ? "bg-accent text-accent-foreground"
                    : isPast
                      ? "bg-success/20 text-success"
                      : "bg-muted text-muted-foreground",
                )}
              >
                {isPast ? "✓" : i + 1}
              </span>
              {st.label}
            </div>
            {!isLast ? (
              <span
                className={cn(
                  "hidden h-px w-6 sm:block",
                  isPast ? "bg-success/40" : "bg-border",
                )}
                aria-hidden
              />
            ) : null}
          </li>
        );
      })}
    </ol>
  );
}

export default function ApplicationDetailPage() {
  const params = useParams();
  const router = useRouter();
  const applicationId = params.id as string;
  const { api, user } = useSession();

  const [app, setApp] = useState<Application | null>(null);
  const [employerUserId, setEmployerUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [aiLoading, setAiLoading] = useState<"cover" | "prep" | null>(null);
  const [coverLetter, setCoverLetter] = useState<string | null>(null);
  const [interviewQuestions, setInterviewQuestions] = useState<string[] | null>(
    null,
  );
  const [aiError, setAiError] = useState<string | null>(null);

  const [withdrawing, setWithdrawing] = useState(false);
  const [copyFeedback, setCopyFeedback] = useState<string | null>(null);
  const toast = useToast();

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const found = await api.get<Application>(routes.applications.byId(applicationId));
      setApp(found);
      let employerId = found.job?.employerUserId ?? null;
      if (!employerId && found.jobId) {
        try {
          const job = await api.get<Job>(routes.jobs.byId(found.jobId));
          employerId = job.employerUserId ?? null;
        } catch {
          /* optional fallback */
        }
      }
      setEmployerUserId(employerId);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Ошибка загрузки");
    } finally {
      setLoading(false);
    }
  }, [api, applicationId]);

  useEffect(() => {
    if (user?.role === "EMPLOYER") {
      router.replace(`/employer/applications/${applicationId}`);
    }
  }, [user?.role, applicationId, router]);

  useEffect(() => {
    void load();
  }, [load]);

  async function generateCoverLetter() {
    if (!app) return;
    setAiLoading("cover");
    setAiError(null);
    setCoverLetter(null);
    try {
      const res = await api.post<CoverLetterResponse>(routes.ai.coverLetter, {
        jobId: app.jobId,
        language: "ru",
        tone: "formal",
      });
      setCoverLetter(res.text);
    } catch (e) {
      setAiError(
        e instanceof ApiError ? e.message : "Сервис AI временно недоступен",
      );
    } finally {
      setAiLoading(null);
    }
  }

  async function generateInterviewPrep() {
    if (!app) return;
    setAiLoading("prep");
    setAiError(null);
    setInterviewQuestions(null);
    try {
      const res = await api.get<InterviewPrepResponse>(
        interviewPrepPath({ jobId: app.jobId, language: "ru", count: 7 }),
      );
      setInterviewQuestions(res.questions);
    } catch (e) {
      const msg =
        e instanceof ApiError && e.status === 403
          ? "Подготовка к интервью доступна только для опубликованных вакансий."
          : e instanceof ApiError
            ? e.message
            : "Сервис AI временно недоступен";
      setAiError(msg);
    } finally {
      setAiLoading(null);
    }
  }

  async function withdrawApplication() {
    if (!app || !confirm("Отозвать отклик? Это действие нельзя отменить.")) return;
    setWithdrawing(true);
    setError(null);
    try {
      const updated = await api.patch<Application>(
        routes.applications.withdraw(app.id),
      );
      setApp(updated);
      toast.success("Отклик отозван");
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Не удалось отозвать отклик");
    } finally {
      setWithdrawing(false);
    }
  }

  const interviewPrepAvailable = app?.job?.status === "PUBLISHED";

  return (
    <RoleGuard allow={["STUDENT"]}>
      <PageContainer className="py-6 md:py-8">
        <Link
          href="/applications"
          className="mb-5 inline-flex items-center gap-2 text-sm font-medium text-muted-foreground transition-colors hover:text-accent"
        >
          <span aria-hidden>←</span> Мои отклики
        </Link>

        {loading ? (
          <DetailPageSkeleton />
        ) : error && !app ? (
          <p className="rounded-xl border border-danger/30 bg-danger/5 px-4 py-3 text-sm text-danger">
            {error}
          </p>
        ) : app ? (
          <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_280px]">
            <div className="min-w-0 space-y-6">
              <Card>
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="min-w-0 flex-1 space-y-3">
                    <div>
                      <h1 className="text-2xl font-semibold tracking-tight text-foreground">
                        {app.job?.title ?? "Вакансия"}
                      </h1>
                      {app.job?.employer?.companyName ? (
                        <p className="mt-1 text-sm text-muted-foreground">
                          {app.job.employer.companyName}
                        </p>
                      ) : null}
                    </div>
                    {app.job ? (
                      <div className="grid gap-2 sm:grid-cols-2">
                        <JobMetric
                          label="Локация"
                          value={jobLocationLine(app.job) ?? "Не указана"}
                        />
                        <JobMetric
                          label="Зарплата"
                          value={salaryLine(app.job) ?? "По договорённости"}
                        />
                      </div>
                    ) : null}
                    {app.jobId ? (
                      <Link
                        href={`/dashboard/jobs/${app.jobId}`}
                        className="inline-block text-sm font-medium text-accent hover:underline"
                      >
                        Открыть вакансию →
                      </Link>
                    ) : null}
                  </div>
                  {app.employerScore != null ? (
                    <div className="shrink-0 rounded-xl border border-border/70 bg-muted/20 px-4 py-3 text-center">
                      <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                        AI-оценка
                      </p>
                      <p
                        className={cn(
                          "mt-1 text-2xl font-bold tabular-nums",
                          app.employerScore >= 70
                            ? "text-success"
                            : app.employerScore >= 40
                              ? "text-accent"
                              : "text-muted-foreground",
                        )}
                      >
                        {app.employerScore}
                      </p>
                    </div>
                  ) : null}
                </div>
              </Card>

              <section className="rounded-2xl border border-border/80 bg-card p-5 shadow-sm">
                <h2 className="mb-4 text-base font-semibold text-foreground">
                  Статус отклика
                </h2>
                <ApplicationStatusStepper status={app.status} />
              </section>

              {app.resume ? (
                <section className="rounded-2xl border border-border/80 bg-card p-5 shadow-sm">
                  <h2 className="mb-3 text-base font-semibold text-foreground">
                    Резюме
                  </h2>
                  <ApplicationResumeCard resume={app.resume} />
                </section>
              ) : null}

              {app.coverLetter ? (
                <section className="rounded-2xl border border-border/80 bg-card p-5 shadow-sm">
                  <h2 className="mb-3 text-base font-semibold text-foreground">
                    Сопроводительное письмо
                  </h2>
                  <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground">
                    {app.coverLetter}
                  </p>
                </section>
              ) : null}

              {aiError ? (
                <p className="rounded-xl border border-danger/30 bg-danger/5 px-4 py-3 text-sm text-danger">
                  {aiError}
                </p>
              ) : null}

              {coverLetter ? (
                <section className="rounded-2xl border border-border/80 bg-card p-5 shadow-sm">
                  <h2 className="mb-3 text-base font-semibold text-foreground">
                    Сгенерированное письмо
                  </h2>
                  <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground">
                    {coverLetter}
                  </p>
                  <Button
                    variant="ghost"
                    className="mt-4 text-xs"
                    onClick={() => {
                      void navigator.clipboard.writeText(coverLetter);
                      toast.success("Письмо скопировано");
                      setCopyFeedback("Скопировано");
                      setTimeout(() => setCopyFeedback(null), 2000);
                    }}
                  >
                    {copyFeedback ?? "Копировать"}
                  </Button>
                </section>
              ) : null}

              {interviewQuestions ? (
                <section className="rounded-2xl border border-border/80 bg-card p-5 shadow-sm">
                  <h2 className="mb-3 text-base font-semibold text-foreground">
                    Вопросы для интервью
                  </h2>
                  <ol className="space-y-3">
                    {interviewQuestions.map((q, i) => (
                      <li key={i} className="flex gap-3 text-sm text-foreground">
                        <span className="min-w-[1.25rem] font-semibold tabular-nums text-muted-foreground">
                          {i + 1}.
                        </span>
                        <span className="leading-relaxed">{q}</span>
                      </li>
                    ))}
                  </ol>
                </section>
              ) : null}

              {error ? (
                <p className="rounded-xl border border-danger/30 bg-danger/5 px-4 py-3 text-sm text-danger">
                  {error}
                </p>
              ) : null}
            </div>

            <aside className="space-y-4 lg:sticky lg:top-20 lg:self-start">
              <Card className="space-y-3">
                <h2 className="text-base font-semibold text-foreground">Действия</h2>
                <Link href={`/applications/${app.id}/chat`} className="block">
                  <Button variant="secondary" className="w-full">
                    Чат с работодателем
                  </Button>
                </Link>
                <Button
                  variant="secondary"
                  className="w-full"
                  disabled={aiLoading === "cover"}
                  onClick={() => void generateCoverLetter()}
                >
                  {aiLoading === "cover" ? "Генерация…" : "AI: письмо"}
                </Button>
                <Button
                  variant="secondary"
                  className="w-full"
                  disabled={aiLoading === "prep" || !interviewPrepAvailable}
                  onClick={() => void generateInterviewPrep()}
                >
                  {aiLoading === "prep" ? "Генерация…" : "AI: к интервью"}
                </Button>
                {!interviewPrepAvailable ? (
                  <p className="text-xs text-muted-foreground">
                    Подготовка к интервью — когда вакансия опубликована.
                  </p>
                ) : null}
                <StudentVideoInterview applicationId={app.id} status={app.status} />
              </Card>

              <Card className="space-y-3">
                <h2 className="text-base font-semibold text-foreground">
                  Отзыв о компании
                </h2>
                <EmployerReviewStatus
                  hasReviewed={app.hasReviewed === true}
                  employerUserId={employerUserId}
                  companyName={app.job?.employer?.companyName}
                  onReviewed={() =>
                    setApp((prev) => (prev ? { ...prev, hasReviewed: true } : prev))
                  }
                />
              </Card>

              {canStudentWithdraw(app.status) ? (
                <Button
                  variant="danger"
                  className="w-full"
                  disabled={withdrawing}
                  onClick={() => void withdrawApplication()}
                >
                  {withdrawing ? "Отзыв…" : "Отозвать отклик"}
                </Button>
              ) : null}
            </aside>
          </div>
        ) : null}
      </PageContainer>
    </RoleGuard>
  );
}
