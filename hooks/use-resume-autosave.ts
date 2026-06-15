"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { routes } from "@/lib/api-routes";
import { useSession } from "@/components/providers/session-provider";
import type { ResumeDraft, ResumeDraftPatch, UserMe } from "@/lib/types";
import {
  canSaveResume,
  resumeContentToRecord,
  TITLE_MAX,
  type ResumeContent,
} from "@/lib/resume-content";
import { resumeErrorMessage } from "@/lib/resume-errors";

export type AutosaveStatus = "idle" | "dirty" | "saving" | "saved" | "error";

const DEBOUNCE_MS = 1500;

type UseResumeAutosaveOptions = {
  draftId: string;
  title: string;
  content: ResumeContent;
  user: UserMe | null;
  enabled?: boolean;
  onSaved?: (draft: ResumeDraft) => void;
};

export function useResumeAutosave({
  draftId,
  title,
  content,
  user,
  enabled = true,
  onSaved,
}: UseResumeAutosaveOptions) {
  const { api } = useSession();
  const [status, setStatus] = useState<AutosaveStatus>("idle");
  const [error, setError] = useState<string | null>(null);

  const titleRef = useRef(title);
  const contentRef = useRef(content);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const savingRef = useRef(false);
  const lastSavedRef = useRef<string>("");
  const prevEnabledRef = useRef(false);

  titleRef.current = title;
  contentRef.current = content;

  const snapshot = useCallback(() => {
    return JSON.stringify({
      title: titleRef.current.trim(),
      content: resumeContentToRecord(contentRef.current),
    });
  }, []);

  const saveNow = useCallback(async () => {
    if (!enabled || savingRef.current) return;
    if (!user || !canSaveResume(contentRef.current, user, titleRef.current)) {
      setStatus("idle");
      setError(null);
      return;
    }
    const current = snapshot();
    if (current === lastSavedRef.current) {
      setStatus("saved");
      return;
    }
    if (titleRef.current.length > TITLE_MAX) {
      setStatus("error");
      setError(`Заголовок не длиннее ${TITLE_MAX} символов.`);
      return;
    }

    savingRef.current = true;
    setStatus("saving");
    setError(null);
    try {
      const patch: ResumeDraftPatch = {
        title: titleRef.current.trim() || null,
        contentJson: resumeContentToRecord(contentRef.current),
      };
      const updated = await api.patch<ResumeDraft>(
        routes.resume.draftById(draftId),
        patch,
      );
      lastSavedRef.current = current;
      setStatus("saved");
      onSaved?.(updated);
    } catch (e) {
      setStatus("error");
      setError(resumeErrorMessage(e, "Ошибка сохранения"));
    } finally {
      savingRef.current = false;
    }
  }, [api, draftId, enabled, onSaved, snapshot, user]);

  const markDirty = useCallback(() => {
    if (!enabled) return;
    if (!user || !canSaveResume(contentRef.current, user, titleRef.current)) {
      setStatus("idle");
      setError(null);
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
      return;
    }
    const current = snapshot();
    if (current === lastSavedRef.current) {
      setStatus("saved");
      return;
    }
    setStatus("dirty");
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      void saveNow();
    }, DEBOUNCE_MS);
  }, [enabled, saveNow, snapshot, user]);

  const flush = useCallback(async () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    await saveNow();
  }, [saveNow]);

  useEffect(() => {
    prevEnabledRef.current = false;
    lastSavedRef.current = "";
    setStatus("idle");
  }, [draftId]);

  useEffect(() => {
    if (enabled && !prevEnabledRef.current) {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
      lastSavedRef.current = snapshot();
      setStatus("saved");
      setError(null);
    }
    prevEnabledRef.current = enabled;
  }, [enabled, snapshot]);

  useEffect(() => {
    if (!enabled) return;
    markDirty();
  }, [title, content, markDirty, enabled]);

  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (status === "dirty" || status === "saving") {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [status]);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  const seedBaseline = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    lastSavedRef.current = snapshot();
    setStatus("saved");
    setError(null);
  }, [snapshot]);

  const statusLabel: Record<AutosaveStatus, string> = {
    idle: "",
    dirty: "Есть несохранённые изменения",
    saving: "Сохранение…",
    saved: "Сохранено",
    error: "Ошибка сохранения",
  };

  return {
    status,
    statusLabel: statusLabel[status],
    error,
    flush,
    seedBaseline,
  };
}
