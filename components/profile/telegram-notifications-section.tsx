"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { routes } from "@/lib/api-routes";
import { ApiError } from "@/lib/api-base";
import { useSession } from "@/components/providers/session-provider";
import { useToast } from "@/components/providers/toast-provider";
import type { EmployerProfile, StudentProfile, TelegramLinkTokenResponse } from "@/lib/types";
import {
  TELEGRAM_LINK_POLL_MS,
  TELEGRAM_LINKED_MASK,
} from "@/lib/notification-payload";
import { Button } from "@/components/ui/button";

type TelegramNotificationsSectionProps = {
  linked: boolean;
  onError: (message: string) => void;
  onLinked?: () => void;
  /** Без внешней рамки — родительская Card уже оформляет секцию */
  embedded?: boolean;
};

function isProfileTelegramLinked(
  profile: StudentProfile | EmployerProfile | null | undefined,
): boolean {
  return profile?.telegramChatId === TELEGRAM_LINKED_MASK;
}

export function TelegramNotificationsSection({
  linked,
  onError,
  onLinked,
  embedded = false,
}: TelegramNotificationsSectionProps) {
  const { api, refreshUser, user } = useSession();
  const toast = useToast();
  const [loading, setLoading] = useState(false);
  const [linkData, setLinkData] = useState<TelegramLinkTokenResponse | null>(null);
  const [expiresAt, setExpiresAt] = useState<number | null>(null);
  const [secondsLeft, setSecondsLeft] = useState<number | null>(null);
  const [polling, setPolling] = useState(false);
  const linkedNotifiedRef = useRef(false);

  const checkLinkedFromUser = useCallback(() => {
    if (!user?.profile) return false;
    return isProfileTelegramLinked(
      user.profile as StudentProfile | EmployerProfile,
    );
  }, [user?.profile]);

  useEffect(() => {
    if (!expiresAt) {
      setSecondsLeft(null);
      return;
    }
    const tick = () => {
      const left = Math.max(0, Math.ceil((expiresAt - Date.now()) / 1000));
      setSecondsLeft(left);
      if (left <= 0) {
        setLinkData(null);
        setPolling(false);
      }
    };
    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, [expiresAt]);

  const handleLinked = useCallback(() => {
    if (linkedNotifiedRef.current) return;
    linkedNotifiedRef.current = true;
    setLinkData(null);
    setExpiresAt(null);
    setPolling(false);
    toast.success("Telegram успешно привязан");
    onLinked?.();
  }, [onLinked, toast]);

  useEffect(() => {
    if (!polling || linked || checkLinkedFromUser()) return;
    const id = window.setInterval(() => {
      void (async () => {
        try {
          await refreshUser();
        } catch {
          /* ignore transient errors while polling */
        }
      })();
    }, TELEGRAM_LINK_POLL_MS);
    return () => window.clearInterval(id);
  }, [polling, linked, checkLinkedFromUser, refreshUser]);

  useEffect(() => {
    if (!polling) return;
    if (linked || checkLinkedFromUser()) {
      handleLinked();
    }
  }, [polling, linked, checkLinkedFromUser, handleLinked, user?.profile]);

  async function requestLink() {
    setLoading(true);
    onError("");
    try {
      const res = await api.post<TelegramLinkTokenResponse>(routes.telegram.linkToken);
      setLinkData(res);
      setExpiresAt(Date.now() + res.expiresInSeconds * 1000);
      setPolling(true);
      window.open(res.deepLink, "_blank", "noopener,noreferrer");
    } catch (e) {
      const msg =
        e instanceof ApiError
          ? e.message
          : "Не удалось получить ссылку. Возможно, Telegram-бот не настроен на сервере.";
      onError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }

  async function checkLinked() {
    setLoading(true);
    onError("");
    try {
      await refreshUser();
      if (checkLinkedFromUser()) {
        handleLinked();
      }
    } catch (e) {
      onError(e instanceof ApiError ? e.message : "Не удалось обновить статус");
    } finally {
      setLoading(false);
    }
  }

  const wrapperClass = embedded ? "space-y-3" : "rounded-xl border border-border/80 bg-muted/30 p-4";

  return (
    <div className={wrapperClass}>
      {!embedded ? (
        <>
          <p className="text-sm font-medium text-foreground">Telegram-уведомления</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Telegram дублирует важные события SJS (отклики, чат, видеосозвон) — это не чат
            платформы. Привязка только через бота, chat_id вручную не принимается.
          </p>
        </>
      ) : (
        <p className="text-sm text-muted-foreground">
          Дублирует отклики, сообщения в чате и видеосозвоны. Привязка только через бота.
        </p>
      )}
      {linked ? (
        <p className="mt-3 inline-flex rounded-full bg-success/10 px-3 py-1 text-xs font-medium text-success">
          Telegram привязан
        </p>
      ) : (
        <p className="mt-3 text-xs text-muted-foreground">Telegram не привязан.</p>
      )}
      <div className="mt-3 flex flex-wrap gap-2">
        {!linked ? (
          <Button
            type="button"
            variant="secondary"
            disabled={loading}
            onClick={() => void requestLink()}
          >
            {loading ? "Загрузка…" : "Привязать Telegram"}
          </Button>
        ) : null}
        <Button
          type="button"
          variant="ghost"
          className="text-sm"
          disabled={loading}
          onClick={() => void checkLinked()}
        >
          Проверить статус
        </Button>
      </div>
      {linkData ? (
        <div className="mt-4 space-y-2 rounded-xl border border-accent/20 bg-card p-3 text-sm">
          <p className="text-muted-foreground">{linkData.instructions}</p>
          <a
            href={linkData.deepLink}
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium text-accent underline-offset-4 hover:underline"
          >
            Открыть бота в Telegram
          </a>
          {polling && !linked ? (
            <p className="text-xs text-muted-foreground">
              Ожидаем подтверждение в Telegram…
            </p>
          ) : null}
          {secondsLeft != null && secondsLeft > 0 ? (
            <p className="text-xs text-muted-foreground">
              Ссылка действует ещё {Math.floor(secondsLeft / 60)}:
              {String(secondsLeft % 60).padStart(2, "0")}
            </p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
