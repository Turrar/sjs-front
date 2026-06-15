"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { routes } from "@/lib/api-routes";
import { useSession } from "@/components/providers/session-provider";
import type {
  Application,
  CoverLetterResponse,
  CreateApplicationBody,
  Job,
  ResumeDraft,
} from "@/lib/types";
import {
  applicationApplyErrorMessage,
  jobApplyRequirementLabels,
  validateApplicationSubmit,
} from "@/lib/application-apply";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

type JobApplyPanelProps = {
  job: Job;
  jobId: string;
  loginReturnPath: string;
};

function formatDraftDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString("ru-RU", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  } catch {
    return "";
  }
}

export function JobApplyPanel({ job, jobId, loginReturnPath }: JobApplyPanelProps) {
  const router = useRouter();
  const { user, api } = useSession();

  const [coverLetter, setCoverLetter] = useState("");
  const [resumeDraftId, setResumeDraftId] = useState("");
  const [drafts, setDrafts] = useState<ResumeDraft[]>([]);
  const [draftsLoading, setDraftsLoading] = useState(false);
  const [applyError, setApplyError] = useState<string | null>(null);
  const [applyPending, setApplyPending] = useState(false);
  const [aiPending, setAiPending] = useState(false);

  const requiresResume = job.requiresResume === true;
  const requiresCoverLetter = job.requiresCoverLetter === true;
  const showCoverLetter =
    requiresCoverLetter || (!requiresResume && !requiresCoverLetter);

  const validation = useMemo(
    () =>
      validateApplicationSubmit(job, {
        resumeDraftId: resumeDraftId || undefined,
        coverLetter,
      }),
    [job, resumeDraftId, coverLetter],
  );

  const loadDrafts = useCallback(async () => {
    if (!requiresResume) return;
    setDraftsLoading(true);
    try {
      const data = await api.get<ResumeDraft[]>(routes.resume.drafts);
      setDrafts(data);
      setResumeDraftId((prev) => prev || (data[0]?.id ?? ""));
    } catch {
      setDrafts([]);
    } finally {
      setDraftsLoading(false);
    }
  }, [api, requiresResume]);

  useEffect(() => {
    if (user?.role === "STUDENT" && requiresResume) {
      void loadDrafts();
    }
  }, [user?.role, requiresResume, loadDrafts]);

  async function generateCoverLetter() {
    setAiPending(true);
    setApplyError(null);
    try {
      const res = await api.post<CoverLetterResponse>(routes.ai.coverLetter, {
        jobId,
        language: "ru",
        tone: "formal",
      });
      setCoverLetter(res.text);
    } catch (e) {
      setApplyError(applicationApplyErrorMessage(e, "AI временно недоступен"));
    } finally {
      setAiPending(false);
    }
  }

  async function apply() {
    if (!user || user.role !== "STUDENT") {
      router.push(`/login?from=${encodeURIComponent(loginReturnPath)}`);
      return;
    }
    if (!validation.valid) return;

    setApplyError(null);
    setApplyPending(true);
    try {
      const body: CreateApplicationBody = { jobId };
      if (requiresResume && resumeDraftId) {
        body.resumeDraftId = resumeDraftId;
      }
      const letter = coverLetter.trim();
      if (letter) body.coverLetter = letter;

      const app = await api.post<Application>(routes.applications.create, body);
      router.push(`/applications/${app.id}`);
    } catch (e) {
      setApplyError(applicationApplyErrorMessage(e, "Не удалось откликнуться"));
    } finally {
      setApplyPending(false);
    }
  }

  const requirementLabels = jobApplyRequirementLabels(job);

  return (
    <Card className="space-y-4">
      <div>
        <h2 className="text-base font-semibold text-foreground">Откликнуться</h2>
        {requirementLabels.length > 0 ? (
          <div className="mt-2 flex flex-wrap gap-2">
            {requirementLabels.map((label) => (
              <span
                key={label}
                className="inline-flex rounded-full bg-accent/10 px-2.5 py-0.5 text-xs font-medium text-accent"
              >
                {label}
              </span>
            ))}
          </div>
        ) : (
          <p className="mt-1 text-sm text-muted-foreground">
            Сопроводительное письмо необязательно.
          </p>
        )}
      </div>

      {requiresResume ? (
        <div className="space-y-2">
          {draftsLoading ? (
            <p className="text-sm text-muted-foreground">Загрузка резюме…</p>
          ) : drafts.length === 0 ? (
            <div className="rounded-xl border border-border/80 bg-muted/30 px-3 py-3 text-sm">
              <p className="text-muted-foreground">
                Нет черновиков резюме. Создайте резюме в конструкторе.
              </p>
              <Link
                href="/resume/new"
                className="mt-2 inline-block font-medium text-accent hover:underline"
              >
                Создать резюме →
              </Link>
            </div>
          ) : (
            <>
              <Select
                label="Резюме"
                value={resumeDraftId}
                onChange={(e) => setResumeDraftId(e.target.value)}
              >
                {drafts.map((d) => (
                  <option key={d.id} value={d.id}>
                    {(d.title?.trim() || "Без названия") +
                      (d.updatedAt ? ` · ${formatDraftDate(d.updatedAt)}` : "")}
                  </option>
                ))}
              </Select>
              <p className="text-xs text-muted-foreground">
                Прикрепляется снимок резюме на момент отклика.
              </p>
            </>
          )}
        </div>
      ) : null}

      {showCoverLetter ? (
        <div className="space-y-2">
          <Textarea
            label={
              requiresCoverLetter
                ? "Сопроводительное письмо (обязательно)"
                : "Сопроводительное письмо"
            }
            value={coverLetter}
            onChange={(e) => setCoverLetter(e.target.value)}
            maxLength={8000}
            placeholder="Почему вам интересна эта вакансия"
          />
          <Button
            type="button"
            variant="secondary"
            className="text-sm"
            disabled={aiPending}
            onClick={() => void generateCoverLetter()}
          >
            {aiPending ? "Генерация…" : "Сгенерировать AI"}
          </Button>
        </div>
      ) : null}

      {!validation.valid && validation.issues.length > 0 ? (
        <ul className="list-inside list-disc text-xs text-muted-foreground">
          {validation.issues.map((issue) => (
            <li key={issue}>{issue}</li>
          ))}
        </ul>
      ) : null}

      {applyError ? (
        <p className="rounded-xl border border-danger/30 bg-danger/5 px-3 py-2 text-sm text-danger">
          {applyError}
        </p>
      ) : null}

      <Button
        className="w-full"
        onClick={() => void apply()}
        disabled={applyPending || !validation.valid}
      >
        {applyPending ? "Отправка…" : "Откликнуться"}
      </Button>
    </Card>
  );
}
