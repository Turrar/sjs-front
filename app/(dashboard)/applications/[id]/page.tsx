"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { routes } from "@/lib/api-routes";
import { ApiError } from "@/lib/api-base";
import { RoleGuard } from "@/components/role-guard";
import { useSession } from "@/components/providers/session-provider";
import type {
  Application,
  CoverLetterResponse,
  InterviewPrepResponse,
} from "@/lib/types";
import { jobLocationLine, salaryLine } from "@/lib/job-display";
import { applicationStatusOrder, getStatusStyle } from "@/lib/application-display";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { LoadingHint, PageContainer } from "@/components/layout/page";
import { cn } from "@/lib/cn";

type VideoRoom = { name: string; url: string; expiresAt: string };

export default function ApplicationDetailPage() {
  const params = useParams();
  const applicationId = params.id as string;
  const { api, user } = useSession();

  const [app, setApp] = useState<Application | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [aiLoading, setAiLoading] = useState<"cover" | "prep" | null>(null);
  const [coverLetter, setCoverLetter] = useState<string | null>(null);
  const [interviewQuestions, setInterviewQuestions] = useState<string[] | null>(null);
  const [aiError, setAiError] = useState<string | null>(null);

  const [videoRoom, setVideoRoom] = useState<VideoRoom | null>(null);
  const [videoLoading, setVideoLoading] = useState(false);
  const [videoError, setVideoError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const list = await api.get<Application[]>(routes.applications.mine);
      const found = list.find((a) => a.id === applicationId);
      if (!found) throw new ApiError(404, "/applications/me", "Отклик не найден");
      setApp(found);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Ошибка загрузки");
    } finally {
      setLoading(false);
    }
  }, [api, applicationId]);

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
        e instanceof ApiError
          ? e.message
          : "AI недоступен — проверьте OPENAI_API_KEY",
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
        `${routes.ai.interviewPrep}?jobId=${app.jobId}&language=ru&count=7`,
      );
      setInterviewQuestions(res.questions);
    } catch (e) {
      setAiError(
        e instanceof ApiError
          ? e.message
          : "AI недоступен — проверьте OPENAI_API_KEY",
      );
    } finally {
      setAiLoading(null);
    }
  }

  async function createVideoRoom() {
    setVideoLoading(true);
    setVideoError(null);
    try {
      const room = await api.post<VideoRoom>(
        routes.video.createRoom(applicationId),
      );
      setVideoRoom(room);
    } catch (e) {
      setVideoError(e instanceof ApiError ? e.message : "Ошибка создания комнаты");
    } finally {
      setVideoLoading(false);
    }
  }

  const statusIdx = app
    ? applicationStatusOrder.indexOf(app.status as (typeof applicationStatusOrder)[number])
    : -1;

  return (
    <RoleGuard allow={["STUDENT", "EMPLOYER"]}>
      <PageContainer narrow>
        <div className="mb-6 flex flex-wrap items-center gap-3 text-sm">
          <Link
            href={user?.role === "EMPLOYER" ? "/employer/jobs" : "/applications"}
            className="font-medium text-muted-foreground transition-colors hover:text-accent"
          >
            ← Мои отклики
          </Link>
        </div>

        {loading ? (
          <LoadingHint />
        ) : error ? (
          <p className="rounded-xl border border-danger/30 bg-danger/5 px-4 py-3 text-sm text-danger">
            {error}
          </p>
        ) : app ? (
          <div className="space-y-6">
            {/* Job info */}
            <Card>
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="min-w-0">
                  <h1 className="text-xl font-bold tracking-tight text-foreground">
                    {app.job?.title ?? "Вакансия"}
                  </h1>
                  {app.job?.employer?.companyName ? (
                    <p className="mt-1 text-sm text-muted-foreground">
                      {app.job.employer.companyName}
                    </p>
                  ) : null}
                  {app.job ? (
                    <div className="mt-2 flex flex-wrap gap-1.5 text-xs text-muted-foreground">
                      {jobLocationLine(app.job) ? (
                        <span className="rounded-md bg-muted/70 px-2 py-0.5">
                          {jobLocationLine(app.job)}
                        </span>
                      ) : null}
                      {salaryLine(app.job) ? (
                        <span className="rounded-md bg-muted/70 px-2 py-0.5">
                          {salaryLine(app.job)}
                        </span>
                      ) : null}
                    </div>
                  ) : null}
                </div>
                {app.employerScore != null ? (
                  <div className="flex flex-col items-center gap-1 rounded-2xl border border-border bg-muted/40 px-4 py-3 text-center">
                    <span className="text-xs font-medium text-muted-foreground">
                      AI-оценка
                    </span>
                    <span
                      className={cn(
                        "text-2xl font-bold tabular-nums",
                        app.employerScore >= 70
                          ? "text-success"
                          : app.employerScore >= 40
                            ? "text-accent"
                            : "text-muted-foreground",
                      )}
                    >
                      {app.employerScore}
                    </span>
                    <span className="text-xs text-muted-foreground">из 100</span>
                  </div>
                ) : null}
              </div>
            </Card>

            {/* Status pipeline */}
            <Card>
              <CardTitle as="h2" className="mb-4 text-sm font-semibold">
                Статус отклика
              </CardTitle>
              <div className="flex flex-wrap gap-2">
                {applicationStatusOrder.map((s, i) => {
                  const st = getStatusStyle(s);
                  const isCurrent = app.status === s;
                  const isPast = statusIdx !== -1 && i < statusIdx;
                  return (
                    <span
                      key={s}
                      className={cn(
                        "rounded-full px-3 py-1 text-xs font-medium transition-all",
                        isCurrent
                          ? cn(st.className, "ring-2 ring-offset-1 ring-accent/40")
                          : isPast
                            ? "bg-success/10 text-success"
                            : "bg-muted/50 text-muted-foreground opacity-50",
                      )}
                    >
                      {isCurrent ? "► " : isPast ? "✓ " : ""}
                      {st.label}
                    </span>
                  );
                })}
                {app.status === "REJECTED" || app.status === "WITHDRAWN" ? (
                  <span
                    className={cn(
                      "rounded-full px-3 py-1 text-xs font-medium ring-2 ring-offset-1 ring-accent/40",
                      getStatusStyle(app.status).className,
                    )}
                  >
                    ► {getStatusStyle(app.status).label}
                  </span>
                ) : null}
              </div>
            </Card>

            {/* Cover letter preview */}
            {app.coverLetter ? (
              <Card>
                <CardTitle as="h2" className="mb-3 text-sm font-semibold">
                  Ваше сопроводительное письмо
                </CardTitle>
                <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground">
                  {app.coverLetter}
                </p>
              </Card>
            ) : null}

            {/* Actions */}
            <Card>
              <CardTitle as="h2" className="mb-1 text-base">
                Действия
              </CardTitle>
              <CardDescription className="mb-4">
                Инструменты для подготовки и связи с работодателем.
              </CardDescription>
              <div className="flex flex-wrap gap-3">
                <Link href={`/applications/${app.id}/chat`}>
                  <Button variant="secondary">Чат с работодателем</Button>
                </Link>
                <Button
                  variant="secondary"
                  disabled={aiLoading === "cover"}
                  onClick={() => void generateCoverLetter()}
                >
                  {aiLoading === "cover" ? "Генерация…" : "AI: Cover Letter"}
                </Button>
                <Button
                  variant="secondary"
                  disabled={aiLoading === "prep"}
                  onClick={() => void generateInterviewPrep()}
                >
                  {aiLoading === "prep" ? "Генерация…" : "AI: Подготовка к интервью"}
                </Button>
                {!videoRoom ? (
                  <Button
                    variant="secondary"
                    disabled={videoLoading}
                    onClick={() => void createVideoRoom()}
                  >
                    {videoLoading ? "Создание…" : "Видеоинтервью"}
                  </Button>
                ) : (
                  <a
                    href={videoRoom.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 rounded-xl border border-success/40 bg-success/10 px-4 py-2.5 text-sm font-medium text-success transition-colors hover:bg-success/20"
                  >
                    Войти в комнату →
                  </a>
                )}
              </div>
              {videoError ? (
                <p className="mt-3 text-sm text-danger">{videoError}</p>
              ) : null}
              {videoRoom ? (
                <p className="mt-2 text-xs text-muted-foreground">
                  Комната действует до{" "}
                  {new Date(videoRoom.expiresAt).toLocaleString()}
                </p>
              ) : null}
            </Card>

            {/* AI results */}
            {aiError ? (
              <p className="rounded-xl border border-danger/30 bg-danger/5 px-4 py-3 text-sm text-danger">
                {aiError}
              </p>
            ) : null}

            {coverLetter ? (
              <Card>
                <CardTitle as="h2" className="mb-3 text-base">
                  Сгенерированное письмо
                </CardTitle>
                <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground">
                  {coverLetter}
                </p>
                <Button
                  variant="ghost"
                  className="mt-4 text-xs"
                  onClick={() => {
                    void navigator.clipboard.writeText(coverLetter);
                  }}
                >
                  Копировать
                </Button>
              </Card>
            ) : null}

            {interviewQuestions ? (
              <Card>
                <CardTitle as="h2" className="mb-3 text-base">
                  Вопросы для подготовки к интервью
                </CardTitle>
                <ol className="space-y-3">
                  {interviewQuestions.map((q, i) => (
                    <li key={i} className="flex gap-3 text-sm text-foreground">
                      <span className="min-w-[1.5rem] font-mono font-bold tabular-nums text-muted-foreground">
                        {i + 1}.
                      </span>
                      <span className="leading-relaxed">{q}</span>
                    </li>
                  ))}
                </ol>
              </Card>
            ) : null}
          </div>
        ) : null}
      </PageContainer>
    </RoleGuard>
  );
}
