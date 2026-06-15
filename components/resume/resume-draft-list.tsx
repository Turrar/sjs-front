"use client";

import Link from "next/link";
import { FileText, Trash2 } from "lucide-react";
import type { ResumeDraft } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/cn";

type ResumeDraftListProps = {
  drafts: ResumeDraft[];
  onDelete: (id: string) => void;
  deletingId?: string | null;
};

export function ResumeDraftList({
  drafts,
  onDelete,
  deletingId,
}: ResumeDraftListProps) {
  if (drafts.length === 0) return null;

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {drafts.map((draft) => (
        <Card key={draft.id} className="flex flex-col">
          <div className="flex flex-1 flex-col gap-3">
            <div className="flex items-start justify-between gap-3">
              <Link
                href={`/resume/${draft.id}`}
                className="min-w-0 flex-1 group"
              >
                <h2 className="font-semibold text-foreground transition-colors group-hover:text-accent">
                  {draft.title?.trim() || "Без названия"}
                </h2>
                <p className="mt-1 text-xs text-muted-foreground">
                  Обновлено{" "}
                  {new Date(draft.updatedAt).toLocaleString("ru-RU", {
                    dateStyle: "short",
                    timeStyle: "short",
                  })}
                </p>
              </Link>
              <Button
                type="button"
                variant="ghost"
                className="shrink-0 text-danger"
                disabled={deletingId === draft.id}
                onClick={() => onDelete(draft.id)}
                aria-label="Удалить черновик"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>

            <div className="flex flex-wrap gap-2">
              {draft.pdfStorageKey ? (
                <span className="inline-flex items-center gap-1 rounded-full border border-border bg-muted/40 px-2.5 py-0.5 text-xs font-medium text-foreground">
                  <FileText className="h-3 w-3" />
                  PDF
                </span>
              ) : null}
            </div>

            <Link
              href={`/resume/${draft.id}`}
              className={cn(
                "mt-auto inline-flex w-full items-center justify-center rounded-xl border border-border bg-card px-4 py-2.5 text-sm font-medium text-foreground shadow-sm transition-[transform,opacity] hover:bg-muted/80 active:scale-[0.98]",
              )}
            >
              Редактировать
            </Link>
          </div>
        </Card>
      ))}
    </div>
  );
}
