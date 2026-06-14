"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { routes } from "@/lib/api-routes";
import { ApiError } from "@/lib/api-base";

const TITLE_MAX = 200;

function resumeErrorMessage(e: unknown, fallback: string): string {
  if (e instanceof ApiError) {
    if (e.status === 403) {
      return "Нужен профиль студента. Заполните профиль в разделе «Профиль».";
    }
    if (e.status === 404) {
      return "Черновик не найден или недоступен.";
    }
    return e.message;
  }
  return fallback;
}
import { RoleGuard } from "@/components/role-guard";
import { useSession } from "@/components/providers/session-provider";
import type {
  ResumeDraft,
  ResumeDraftCreate,
  ResumeDraftPatch,
  MediaUrlResponse,
} from "@/lib/types";
import {
  putFileToPresignedUrl,
  requestPresign,
} from "@/lib/presign-upload";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import {
  PageContainer,
  PageHeader,
} from "@/components/layout/page";
import { FormSkeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/cn";

export default function ResumePage() {
  const { api } = useSession();
  const [drafts, setDrafts] = useState<ResumeDraft[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [jsonText, setJsonText] = useState("{}");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [pdfUploading, setPdfUploading] = useState(false);
  const [suggestions, setSuggestions] = useState<string | null>(null);
  const [suggestionsLoading, setSuggestionsLoading] = useState(false);
  const [suggestionsError, setSuggestionsError] = useState<string | null>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);

  const selected = drafts.find((d) => d.id === selectedId) ?? null;

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.get<ResumeDraft[]>(routes.resume.drafts);
      setDrafts(data);
      setSelectedId((prev) => {
        if (data.length === 0) return null;
        if (!prev) return data[0].id;
        return prev;
      });
    } catch (e) {
      setError(resumeErrorMessage(e, "Ошибка загрузки"));
    } finally {
      setLoading(false);
    }
  }, [api]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    const d = drafts.find((x) => x.id === selectedId);
    if (d) {
      setTitle(d.title ?? "");
      setJsonText(JSON.stringify(d.contentJson ?? {}, null, 2));
    }
  }, [selectedId, drafts]);

  async function createDraft() {
    setError(null);
    try {
      const body: ResumeDraftCreate = {
        contentJson: { sections: [] },
        title: "Новое резюме",
      };
      const d = await api.post<ResumeDraft>(routes.resume.drafts, body);
      setDrafts((prev) => [d, ...prev]);
      setSelectedId(d.id);
    } catch (e) {
      setError(resumeErrorMessage(e, "Ошибка создания"));
    }
  }

  async function saveDraft() {
    if (!selectedId) return;
    setError(null);
    setSaving(true);
    if (title.length > TITLE_MAX) {
      setError(`Заголовок не длиннее ${TITLE_MAX} символов.`);
      return;
    }
    let parsed: Record<string, unknown>;
    try {
      parsed = JSON.parse(jsonText) as Record<string, unknown>;
    } catch {
      setError("Некорректный JSON");
      return;
    }
    try {
      const patch: ResumeDraftPatch = {
        title: title.trim() || null,
        contentJson: parsed,
      };
      const d = await api.patch<ResumeDraft>(
        routes.resume.draftById(selectedId),
        patch,
      );
      setDrafts((prev) => prev.map((x) => (x.id === d.id ? d : x)));
    } catch (e) {
      setError(resumeErrorMessage(e, "Ошибка сохранения"));
    } finally {
      setSaving(false);
    }
  }

  async function downloadPdf() {
    if (!selected?.pdfStorageKey) return;
    setError(null);
    try {
      const res = await api.get<MediaUrlResponse>(
        routes.media.url(selected.pdfStorageKey),
      );
      window.open(res.url, "_blank", "noopener,noreferrer");
    } catch (e) {
      setError(resumeErrorMessage(e, "Не удалось скачать PDF"));
    }
  }

  async function uploadPdf() {
    if (!selectedId || !pdfFile) return;
    setPdfUploading(true);
    setError(null);
    try {
      const presign = await requestPresign(api, pdfFile);
      await putFileToPresignedUrl(presign.uploadUrl, pdfFile);
      const patch: ResumeDraftPatch = {
        pdfStorageKey: presign.storageKey,
      };
      const d = await api.patch<ResumeDraft>(
        routes.resume.draftById(selectedId),
        patch,
      );
      setDrafts((prev) => prev.map((x) => (x.id === d.id ? d : x)));
      setPdfFile(null);
    } catch (e) {
      setError(
        e instanceof ApiError
          ? resumeErrorMessage(e, e.message)
          : e instanceof Error
            ? e.message
            : "Ошибка загрузки PDF",
      );
    } finally {
      setPdfUploading(false);
    }
  }

  async function unlinkPdf() {
    if (!selectedId) return;
    setError(null);
    try {
      const patch: ResumeDraftPatch = { pdfStorageKey: null };
      const d = await api.patch<ResumeDraft>(
        routes.resume.draftById(selectedId),
        patch,
      );
      setDrafts((prev) => prev.map((x) => (x.id === d.id ? d : x)));
    } catch (e) {
      setError(resumeErrorMessage(e, "Не удалось отвязать PDF"));
    }
  }

  async function fetchSuggestions() {
    if (!selectedId) return;
    setSuggestionsLoading(true);
    setSuggestionsError(null);
    setSuggestions(null);
    try {
      const res = await api.get<unknown>(
        `${routes.resume.suggestions(selectedId)}?language=ru`,
      );
      setSuggestions(typeof res === "string" ? res : JSON.stringify(res, null, 2));
      setTimeout(() => suggestionsRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
    } catch (e) {
      setSuggestionsError(
        resumeErrorMessage(e, "Сервис AI временно недоступен"),
      );
    } finally {
      setSuggestionsLoading(false);
    }
  }

  async function deleteDraft(id: string) {
    if (!confirm("Удалить черновик?")) return;
    try {
      await api.delete(routes.resume.draftById(id));
      setDrafts((prev) => prev.filter((d) => d.id !== id));
      if (selectedId === id) {
        setSelectedId(null);
        setTitle("");
        setJsonText("{}");
      }
    } catch (e) {
      setError(resumeErrorMessage(e, "Ошибка удаления"));
    }
  }

  return (
    <RoleGuard allow={["STUDENT"]}>
      <PageContainer>
        <PageHeader
          title="Резюме"
          description="Черновики резюме и привязка PDF для откликов."
          action={
            <Button type="button" onClick={() => void createDraft()}>
              Новый черновик
            </Button>
          }
        />

        {error ? (
          <p className="mb-6 rounded-xl border border-danger/30 bg-danger/5 px-4 py-3 text-sm text-danger">
            {error}
          </p>
        ) : null}

        {loading ? (
          <FormSkeleton fields={8} />
        ) : (
          <div className="grid gap-6 lg:grid-cols-[minmax(0,240px)_1fr]">
            <Card padding={false} className="overflow-hidden p-4 sm:p-5">
              <CardTitle className="px-1 text-base">Черновики</CardTitle>
              <ul className="mt-4 space-y-1">
                {drafts.map((d) => (
                  <li key={d.id}>
                    <button
                      type="button"
                      className={cn(
                        "w-full rounded-xl px-3 py-2.5 text-left text-sm transition-colors",
                        selectedId === d.id
                          ? "bg-accent font-medium text-accent-foreground shadow-sm"
                          : "text-foreground hover:bg-muted",
                      )}
                      onClick={() => setSelectedId(d.id)}
                    >
                      <span className="block font-medium">
                        {d.title || "Без названия"}
                      </span>
                      <span className="mt-0.5 block text-xs font-normal opacity-80">
                        Обновлено:{" "}
                        {new Date(d.updatedAt).toLocaleString("ru-RU", {
                          dateStyle: "short",
                          timeStyle: "short",
                        })}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            </Card>
            <Card>
              {selected ? (
                <>
                  <CardTitle as="h2">Редактирование</CardTitle>
                  <CardDescription className="mb-6">
                    Заголовок — до {TITLE_MAX} символов. Содержимое — валидный JSON.
                  </CardDescription>
                  <div className="mb-6 rounded-xl border border-border/80 bg-muted/30 p-4">
                    <p className="text-sm font-medium text-foreground">PDF</p>
                    {selected.pdfStorageKey ? (
                      <p className="mt-1 text-xs text-muted-foreground">
                        PDF привязан к черновику.
                      </p>
                    ) : (
                      <p className="mt-1 text-xs text-muted-foreground">
                        PDF ещё не привязан.
                      </p>
                    )}
                    <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-end">
                      <label className="flex min-h-[44px] flex-1 cursor-pointer flex-col justify-center rounded-xl border border-dashed border-border bg-card px-3 py-2">
                        <span className="text-sm">
                          {pdfFile ? pdfFile.name : "Выберите PDF"}
                        </span>
                        <input
                          type="file"
                          className="sr-only"
                          accept="application/pdf"
                          onChange={(e) =>
                            setPdfFile(e.target.files?.[0] ?? null)
                          }
                        />
                      </label>
                      <Button
                        type="button"
                        variant="secondary"
                        disabled={!pdfFile || pdfUploading}
                        onClick={() => void uploadPdf()}
                      >
                        {pdfUploading ? "Загрузка…" : "Загрузить PDF"}
                      </Button>
                      {selected.pdfStorageKey ? (
                        <Button
                          type="button"
                          variant="secondary"
                          onClick={() => void downloadPdf()}
                        >
                          Скачать PDF
                        </Button>
                      ) : null}
                      {selected.pdfStorageKey ? (
                        <Button
                          type="button"
                          variant="ghost"
                          disabled={pdfUploading}
                          onClick={() => void unlinkPdf()}
                        >
                          Отвязать PDF
                        </Button>
                      ) : null}
                    </div>
                  </div>
                  <div className="space-y-5">
                    <Input
                      label="Заголовок"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      maxLength={TITLE_MAX}
                    />
                    <Textarea
                      label="contentJson"
                      value={jsonText}
                      onChange={(e) => setJsonText(e.target.value)}
                      className="min-h-[300px] font-mono text-xs leading-relaxed"
                    />
                    <div className="flex flex-wrap gap-3 pt-2">
                      <Button type="button" onClick={() => void saveDraft()} disabled={saving}>
                        {saving ? "Сохранение…" : "Сохранить"}
                      </Button>
                      <Button
                        type="button"
                        variant="secondary"
                        disabled={suggestionsLoading}
                        onClick={() => void fetchSuggestions()}
                      >
                        {suggestionsLoading ? "AI анализирует…" : "AI: советы по резюме"}
                      </Button>
                      <Button
                        type="button"
                        variant="danger"
                        onClick={() => void deleteDraft(selected.id)}
                      >
                        Удалить
                      </Button>
                    </div>
                    {suggestionsError ? (
                      <p className="rounded-xl border border-danger/30 bg-danger/5 px-3 py-2 text-sm text-danger">
                        {suggestionsError}
                      </p>
                    ) : null}
                    {suggestions ? (
                      <div
                        ref={suggestionsRef}
                        className="rounded-xl border border-border bg-muted/40 p-4"
                      >
                        <p className="mb-2 text-sm font-semibold text-foreground">
                          Рекомендации AI
                        </p>
                        <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground">
                          {suggestions}
                        </p>
                      </div>
                    ) : null}
                  </div>
                </>
              ) : (
                <p className="rounded-xl bg-muted/50 py-10 text-center text-sm text-muted-foreground">
                  Выберите черновик слева или создайте новый.
                </p>
              )}
            </Card>
          </div>
        )}
      </PageContainer>
    </RoleGuard>
  );
}
