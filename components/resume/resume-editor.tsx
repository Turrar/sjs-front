"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { routes } from "@/lib/api-routes";
import { useSession } from "@/components/providers/session-provider";
import { useToast } from "@/components/providers/toast-provider";
import type { ResumeDraft, UserMe } from "@/lib/types";
import {
  canSaveResume,
  normalizeResumeContent,
  personalFromProfile,
  TITLE_MAX,
  type ResumeContent,
} from "@/lib/resume-content";
import { resumeErrorMessage } from "@/lib/resume-errors";
import { useResumeAutosave } from "@/hooks/use-resume-autosave";
import { ResumeSectionPersonal } from "@/components/resume/resume-section-personal";
import { ResumeSectionSummary } from "@/components/resume/resume-section-summary";
import { ResumeSectionEducation } from "@/components/resume/resume-section-education";
import { ResumeSectionExperience } from "@/components/resume/resume-section-experience";
import { ResumeSectionSkills } from "@/components/resume/resume-section-skills";
import { ResumeSectionLanguages } from "@/components/resume/resume-section-languages";
import { ResumePdfPanel } from "@/components/resume/resume-pdf-panel";
import { ResumeSuggestionsPanel } from "@/components/resume/resume-suggestions-panel";
import { ResumeValidationHint } from "@/components/resume/resume-validation-hint";
import { ResumePreview } from "@/components/resume/resume-preview";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import {
  PageContainer,
} from "@/components/layout/page";
import { DetailPageSkeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/cn";

type ResumeEditorProps = {
  draftId: string;
};

export function ResumeEditor({ draftId }: ResumeEditorProps) {
  const router = useRouter();
  const { api, user } = useSession();
  const toast = useToast();

  const [draft, setDraft] = useState<ResumeDraft | null>(null);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState<ResumeContent | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [baselineReady, setBaselineReady] = useState(false);

  const onSaved = useCallback((updated: ResumeDraft) => {
    setDraft(updated);
  }, []);

  const autosave = useResumeAutosave({
    draftId,
    title,
    content: content ?? normalizeResumeContent({}),
    user: user ?? null,
    enabled: baselineReady && content !== null,
    onSaved,
  });

  const saveAllowed = user && content ? canSaveResume(content, user, title) : false;

  const loadDraft = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    setBaselineReady(false);
    try {
      const data = await api.get<ResumeDraft>(routes.resume.draftById(draftId));
      setDraft(data);
      setTitle(data.title ?? "");
      setContent(normalizeResumeContent(data.contentJson ?? {}));
      setBaselineReady(true);
    } catch (e) {
      setLoadError(resumeErrorMessage(e, "Ошибка загрузки"));
    } finally {
      setLoading(false);
    }
  }, [api, draftId]);

  useEffect(() => {
    void loadDraft();
  }, [loadDraft]);

  function updateContent(patch: Partial<ResumeContent>) {
    setContent((prev) => (prev ? { ...prev, ...patch } : prev));
  }

  async function deleteDraft() {
    if (!confirm("Удалить черновик?")) return;
    setDeleting(true);
    try {
      await api.delete(routes.resume.draftById(draftId));
      toast.success("Черновик удалён");
      router.push("/resume");
    } catch (e) {
      toast.error(resumeErrorMessage(e, "Ошибка удаления"));
    } finally {
      setDeleting(false);
    }
  }

  if (loading) {
    return (
      <PageContainer className="py-6 md:py-8">
        <DetailPageSkeleton />
      </PageContainer>
    );
  }

  if (loadError || !draft || !content) {
    return (
      <PageContainer className="py-6 md:py-8">
        <Link
          href="/resume"
          className="mb-5 inline-flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-accent"
        >
          <span aria-hidden>←</span> Мои резюме
        </Link>
        <p className="rounded-xl border border-danger/30 bg-danger/5 px-4 py-3 text-sm text-danger">
          {loadError ?? "Черновик не найден"}
        </p>
        {loadError?.includes("профиль") ? (
          <Link
            href="/profile"
            className="mt-4 inline-block text-sm font-medium text-accent hover:underline"
          >
            Перейти в профиль →
          </Link>
        ) : null}
      </PageContainer>
    );
  }

  return (
    <PageContainer className="py-6 md:py-8">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <Link
          href="/resume"
          className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground transition-colors hover:text-accent"
        >
          <span aria-hidden>←</span> Мои резюме
        </Link>
        <div className="flex items-center gap-3">
          <span
            className={cn(
              "text-xs font-medium",
              autosave.status === "error"
                ? "text-danger"
                : autosave.status === "dirty"
                  ? "text-accent"
                  : "text-muted-foreground",
            )}
          >
            {autosave.statusLabel}
          </span>
          <Button
            type="button"
            variant="secondary"
            disabled={autosave.status === "saving" || !saveAllowed}
            onClick={() => void autosave.flush()}
          >
            {autosave.status === "saving" ? "Сохранение…" : "Сохранить"}
          </Button>
        </div>
      </div>

      {user ? (
        <ResumeValidationHint
          content={content}
          user={user}
          title={title}
          className="mb-4"
        />
      ) : null}

      <div className="mb-6">
        <Input
          label="Название черновика"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          maxLength={TITLE_MAX}
          placeholder="Резюме Frontend 2026"
        />
      </div>

      {autosave.error ? (
        <p className="mb-4 rounded-xl border border-danger/30 bg-danger/5 px-4 py-3 text-sm text-danger">
          {autosave.error}
        </p>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_300px]">
        <div className="min-w-0 space-y-6">
          <ResumeSectionPersonal
            value={content.personal}
            onChange={(personal) => updateContent({ personal })}
            onFillFromProfile={
              user
                ? () => updateContent({ personal: personalFromProfile(user as UserMe) })
                : undefined
            }
          />
          <ResumeSectionSummary
            value={content.summary}
            onChange={(summary) => updateContent({ summary })}
          />
          <ResumeSectionEducation
            value={content.education}
            onChange={(education) => updateContent({ education })}
          />
          <ResumeSectionExperience
            value={content.experience}
            onChange={(experience) => updateContent({ experience })}
          />
          <ResumeSectionSkills
            value={content.skills}
            onChange={(skills) => updateContent({ skills })}
          />
          <ResumeSectionLanguages
            value={content.languages}
            onChange={(languages) => updateContent({ languages })}
          />

          <Card className="border-border/70 bg-muted/20">
            <p className="text-sm leading-relaxed text-muted-foreground">
              Последний обновлённый черновик влияет на{" "}
              <span className="font-medium text-foreground">matchScore</span> вакансий.
              При отклике работодатель видит профиль студента, а не конкретный draft id.
            </p>
          </Card>

          <Button
            type="button"
            variant="danger"
            disabled={deleting}
            onClick={() => void deleteDraft()}
          >
            {deleting ? "Удаление…" : "Удалить черновик"}
          </Button>
        </div>

        <aside className="space-y-4 lg:sticky lg:top-20 lg:self-start">
          <div className="lg:hidden">
            <ResumePreview title={title} content={content} />
          </div>
          <ResumePdfPanel
            draft={draft}
            onUpdated={(updated) => setDraft(updated)}
          />
          <ResumeSuggestionsPanel draftId={draftId} />
          <div className="hidden lg:block">
            <ResumePreview title={title} content={content} />
          </div>
        </aside>
      </div>
    </PageContainer>
  );
}
