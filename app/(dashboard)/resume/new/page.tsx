"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { routes } from "@/lib/api-routes";
import { RoleGuard } from "@/components/role-guard";
import { useSession } from "@/components/providers/session-provider";
import { useToast } from "@/components/providers/toast-provider";
import type { ResumeDraft, ResumeDraftCreate } from "@/lib/types";
import {
  canSaveResume,
  defaultDraftTitle,
  emptyResumeContent,
  resumeContentToRecord,
  TITLE_MAX,
  type ResumeContent,
} from "@/lib/resume-content";
import { resumeErrorMessage } from "@/lib/resume-errors";
import { ResumeSectionPersonal } from "@/components/resume/resume-section-personal";
import { ResumeSectionSummary } from "@/components/resume/resume-section-summary";
import { ResumeSectionEducation } from "@/components/resume/resume-section-education";
import { ResumeSectionExperience } from "@/components/resume/resume-section-experience";
import { ResumeSectionSkills } from "@/components/resume/resume-section-skills";
import { ResumeSectionLanguages } from "@/components/resume/resume-section-languages";
import { ResumeValidationHint } from "@/components/resume/resume-validation-hint";
import { ResumePreview } from "@/components/resume/resume-preview";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PageContainer, PageHeader } from "@/components/layout/page";

export default function ResumeCreatePage() {
  const router = useRouter();
  const { api, user } = useSession();
  const toast = useToast();

  const [title, setTitle] = useState("");
  const [content, setContent] = useState<ResumeContent | null>(null);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    setTitle((prev) => prev || defaultDraftTitle(user));
    setContent((prev) => prev ?? emptyResumeContent(user));
  }, [user]);

  if (!user || !content) {
    return (
      <RoleGuard allow={["STUDENT"]}>
        <PageContainer className="py-6 md:py-8">
          <p className="text-sm text-muted-foreground">Загрузка…</p>
        </PageContainer>
      </RoleGuard>
    );
  }

  const canCreate = canSaveResume(content, user, title);

  function updateContent(patch: Partial<ResumeContent>) {
    setContent((prev) => (prev ? { ...prev, ...patch } : prev));
  }

  async function createDraft() {
    if (!canCreate || !content) return;
    setCreating(true);
    setError(null);
    try {
      const body: ResumeDraftCreate = {
        title: title.trim(),
        contentJson: resumeContentToRecord(content),
      };
      const draft = await api.post<ResumeDraft>(routes.resume.drafts, body);
      toast.success("Резюме создано");
      router.push(`/resume/${draft.id}`);
    } catch (e) {
      setError(resumeErrorMessage(e, "Ошибка создания"));
    } finally {
      setCreating(false);
    }
  }

  return (
    <RoleGuard allow={["STUDENT"]}>
      <PageContainer className="py-6 md:py-8">
        <Link
          href="/resume"
          className="mb-5 inline-flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-accent"
        >
          <span aria-hidden>←</span> Мои резюме
        </Link>

        <PageHeader
          title="Новое резюме"
          description="Заполните обязательные поля, затем создайте черновик. PDF можно добавить позже."
        />

        {error ? (
          <p className="mb-4 rounded-xl border border-danger/30 bg-danger/5 px-4 py-3 text-sm text-danger">
            {error}
          </p>
        ) : null}

        <div className="mb-4">
          <Input
            label="Название черновика"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            maxLength={TITLE_MAX}
            placeholder="Frontend-стажёр 2026"
          />
        </div>

        <ResumeValidationHint
          content={content}
          user={user}
          title={title}
          className="mb-6"
        />

        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_300px]">
          <div className="min-w-0 space-y-6">
            <ResumeSectionPersonal
              value={content.personal}
              onChange={(personal) => updateContent({ personal })}
              onFillFromProfile={() =>
                updateContent({
                  personal: emptyResumeContent(user).personal,
                })
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

            <Button
              type="button"
              disabled={creating || !canCreate}
              onClick={() => void createDraft()}
            >
              {creating ? "Создание…" : "Создать резюме"}
            </Button>
          </div>

          <aside className="hidden lg:block lg:sticky lg:top-20 lg:self-start">
            <ResumePreview title={title} content={content} />
          </aside>
        </div>
      </PageContainer>
    </RoleGuard>
  );
}
