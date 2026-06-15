"use client";

import { useRef, useState } from "react";
import { FileText, Upload } from "lucide-react";
import { routes } from "@/lib/api-routes";
import { useSession } from "@/components/providers/session-provider";
import { useToast } from "@/components/providers/toast-provider";
import type { MediaUrlResponse, ResumeDraft } from "@/lib/types";
import { uploadResumePdf } from "@/lib/presign-upload";
import { resumeErrorMessage } from "@/lib/resume-errors";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/cn";

type ResumePdfPanelProps = {
  draft: ResumeDraft;
  onUpdated: (draft: ResumeDraft) => void;
};

export function ResumePdfPanel({ draft, onUpdated }: ResumePdfPanelProps) {
  const { api } = useSession();
  const toast = useToast();
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [unlinking, setUnlinking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);

  const hasPdf = Boolean(draft.pdfStorageKey);

  async function handleFile(file: File) {
    setUploading(true);
    setError(null);
    try {
      const updated = await uploadResumePdf(api, draft.id, file);
      onUpdated(updated);
      toast.success("PDF прикреплён");
    } catch (e) {
      const msg = resumeErrorMessage(e, "Ошибка загрузки PDF");
      setError(msg);
      toast.error(msg);
    } finally {
      setUploading(false);
    }
  }

  async function openPdf() {
    if (!draft.pdfStorageKey) return;
    setError(null);
    try {
      const res = await api.get<MediaUrlResponse>(
        routes.media.url(draft.pdfStorageKey),
      );
      window.open(res.url, "_blank", "noopener,noreferrer");
    } catch (e) {
      setError(resumeErrorMessage(e, "Не удалось открыть PDF"));
    }
  }

  async function unlinkPdf() {
    if (!draft.pdfStorageKey) return;
    setUnlinking(true);
    setError(null);
    try {
      const updated = await api.patch<ResumeDraft>(routes.resume.draftById(draft.id), {
        pdfStorageKey: null,
      });
      onUpdated(updated);
      toast.success("PDF отвязан");
    } catch (e) {
      setError(resumeErrorMessage(e, "Не удалось отвязать PDF"));
    } finally {
      setUnlinking(false);
    }
  }

  return (
    <Card>
      <CardTitle>PDF</CardTitle>
      <CardDescription className="mb-4">
        Опционально прикрепите готовый файл резюме.
      </CardDescription>

      {hasPdf ? (
        <div className="mb-4 flex items-center gap-2 rounded-xl border border-success/30 bg-success/5 px-3 py-2.5 text-sm text-foreground">
          <FileText className="h-4 w-4 shrink-0 text-success" />
          <span>PDF прикреплён к черновику</span>
        </div>
      ) : null}

      <div
        className={cn(
          "rounded-xl border border-dashed px-4 py-6 text-center transition-colors",
          dragOver
            ? "border-accent bg-accent/5"
            : "border-border bg-muted/25",
          uploading && "pointer-events-none opacity-60",
        )}
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          const file = e.dataTransfer.files[0];
          if (file) void handleFile(file);
        }}
      >
        <Upload className="mx-auto h-6 w-6 text-muted-foreground" />
        <p className="mt-2 text-sm font-medium text-foreground">
          {uploading ? "Загрузка…" : "Перетащите PDF или выберите файл"}
        </p>
        <Button
          type="button"
          variant="secondary"
          className="mt-3"
          disabled={uploading}
          onClick={() => inputRef.current?.click()}
        >
          Выбрать PDF
        </Button>
        <input
          ref={inputRef}
          type="file"
          className="sr-only"
          accept="application/pdf"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) void handleFile(file);
            e.target.value = "";
          }}
        />
      </div>

      {hasPdf ? (
        <div className="mt-3 flex flex-wrap gap-2">
          <Button type="button" variant="secondary" onClick={() => void openPdf()}>
            Открыть PDF
          </Button>
          <Button
            type="button"
            variant="ghost"
            className="text-danger"
            disabled={unlinking || uploading}
            onClick={() => void unlinkPdf()}
          >
            {unlinking ? "Отвязка…" : "Отвязать"}
          </Button>
        </div>
      ) : null}

      {error ? (
        <p className="mt-3 text-sm text-danger">{error}</p>
      ) : null}
    </Card>
  );
}
