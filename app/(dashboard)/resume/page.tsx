"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { routes } from "@/lib/api-routes";
import { RoleGuard } from "@/components/role-guard";
import { useSession } from "@/components/providers/session-provider";
import { useToast } from "@/components/providers/toast-provider";
import type { ResumeDraft } from "@/lib/types";
import { resumeErrorMessage } from "@/lib/resume-errors";
import { ResumeDraftList } from "@/components/resume/resume-draft-list";
import { Button } from "@/components/ui/button";
import {
  EmptyState,
  PageContainer,
  PageHeader,
} from "@/components/layout/page";
import { FormSkeleton } from "@/components/ui/skeleton";

export default function ResumeListPage() {
  const { api } = useSession();
  const toast = useToast();

  const [drafts, setDrafts] = useState<ResumeDraft[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.get<ResumeDraft[]>(routes.resume.drafts);
      setDrafts(data);
    } catch (e) {
      setError(resumeErrorMessage(e, "Ошибка загрузки"));
    } finally {
      setLoading(false);
    }
  }, [api]);

  useEffect(() => {
    void load();
  }, [load]);

  async function deleteDraft(id: string) {
    if (!confirm("Удалить черновик?")) return;
    setDeletingId(id);
    try {
      await api.delete(routes.resume.draftById(id));
      setDrafts((prev) => prev.filter((d) => d.id !== id));
      toast.success("Черновик удалён");
    } catch (e) {
      toast.error(resumeErrorMessage(e, "Ошибка удаления"));
    } finally {
      setDeletingId(null);
    }
  }

  const profileRequired = error?.includes("профиль");

  return (
    <RoleGuard allow={["STUDENT"]}>
      <PageContainer className="py-6 md:py-8">
        <PageHeader
          title="Резюме"
          description="Конструктор черновиков, PDF и AI-советы для улучшения."
          action={
            <Link href="/resume/new">
              <Button type="button">Новое резюме</Button>
            </Link>
          }
        />

        {error ? (
          <div className="mb-6 rounded-xl border border-danger/30 bg-danger/5 px-4 py-3 text-sm text-danger">
            <p>{error}</p>
            {profileRequired ? (
              <Link
                href="/profile"
                className="mt-2 inline-block font-medium text-accent hover:underline"
              >
                Заполнить профиль →
              </Link>
            ) : null}
          </div>
        ) : null}

        {loading ? (
          <FormSkeleton fields={4} />
        ) : drafts.length === 0 && !error ? (
          <EmptyState
            title="Пока нет резюме"
            description="Создайте первый черновик — данные подставятся из профиля."
          >
            <Link href="/resume/new">
              <Button type="button">Создать первое резюме</Button>
            </Link>
          </EmptyState>
        ) : (
          <ResumeDraftList
            drafts={drafts}
            onDelete={(id) => void deleteDraft(id)}
            deletingId={deletingId}
          />
        )}
      </PageContainer>
    </RoleGuard>
  );
}
