"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { MessageCircle } from "lucide-react";
import { routes } from "@/lib/api-routes";
import { useSession } from "@/components/providers/session-provider";
import { useToast } from "@/components/providers/toast-provider";
import type { EmployerProfile, StudentProfile, TelegramLinkTokenResponse } from "@/lib/types";
import {
  isTelegramLinked,
  TELEGRAM_LINK_POLL_MS,
  TELEGRAM_POLLING_HINT_MS,
  telegramLinkErrorMessage,
} from "@/lib/telegram-display";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/cn";

type TelegramNotificationsSectionProps = {
  linked: boolean;
  onError: (message: string) => void;
  onLinked?: () => void | Promise<void>;
  /** Без внешней рамки — родительская Card уже оформляет секцию */
  embedded?: boolean;
};

export function TelegramNotificationsSection({
  linked,
  onError,
  onLinked,
  embedded = false,
}: TelegramNotificationsSectionProps) {
  const { api, refreshUser, user } = useSession();
  const { success: toastSuccess, error: toastError } = useToast();

  const [loading, setLoading] = useState(false);
  const [linkData, setLinkData] = useState<TelegramLinkTokenResponse | null>(null);
  const [expiresAt, setExpiresAt] = useState<number | null>(null);
  const [secondsLeft, setSecondsLeft] = useState<number | null>(null);
  const [polling, setPolling] = useState(false);
  const [expired, setExpired] = useState(false);
  const [showSlowHint, setShowSlowHint] = useState(false);

  const linkedNotifiedRef = useRef(false);
  const pollingStartedAtRef = useRef<number | null>(null);

  const checkLinkedFromUser = useCallback(() => {
    if (!user?.profile) return false;
    return isTelegramLinked(user.profile as StudentProfile | EmployerProfile);
  }, [user?.profile]);

  const isLinked = linked || checkLinkedFromUser();

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
        setExpired(true);
        pollingStartedAtRef.current = null;
        setShowSlowHint(false);
      }
    };
    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, [expiresAt]);

  const handleLinked = useCallback(async () => {
    if (linkedNotifiedRef.current) return;
    linkedNotifiedRef.current = true;
    setLinkData(null);
    setExpiresAt(null);
    setPolling(false);
    setExpired(false);
    setShowSlowHint(false);
    pollingStartedAtRef.current = null;
    toastSuccess("Telegram подключён");
    await onLinked?.();
  }, [onLinked, toastSuccess]);

  useEffect(() => {
    if (!polling || isLinked) return;
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
  }, [polling, isLinked, refreshUser]);

  useEffect(() => {
    if (!polling || isLinked) return;
    if (checkLinkedFromUser()) {
      void handleLinked();
    }
  }, [polling, isLinked, checkLinkedFromUser, handleLinked, user?.profile]);

  useEffect(() => {
    if (!polling || isLinked) {
      setShowSlowHint(false);
      return;
    }
    const started = pollingStartedAtRef.current ?? Date.now();
    pollingStartedAtRef.current = started;
    const id = window.setInterval(() => {
      if (Date.now() - started >= TELEGRAM_POLLING_HINT_MS) {
        setShowSlowHint(true);
      }
    }, 5_000);
    return () => window.clearInterval(id);
  }, [polling, isLinked]);

  async function requestLink() {
    setLoading(true);
    setExpired(false);
    linkedNotifiedRef.current = false;
    pollingStartedAtRef.current = null;
    setShowSlowHint(false);
    onError("");
    try {
      const res = await api.post<TelegramLinkTokenResponse>(routes.telegram.linkToken);
      setLinkData(res);
      setExpiresAt(Date.now() + res.expiresInSeconds * 1000);
      setPolling(true);
      pollingStartedAtRef.current = Date.now();
      window.open(res.deepLink, "_blank", "noopener,noreferrer");
    } catch (e) {
      const msg = telegramLinkErrorMessage(
        e,
        "Не удалось получить ссылку. Возможно, Telegram-бот не настроен на сервере.",
      );
      onError(msg);
      toastError(msg);
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
        await handleLinked();
      }
    } catch (e) {
      onError(telegramLinkErrorMessage(e, "Не удалось обновить статус"));
    } finally {
      setLoading(false);
    }
  }

  const wrapperClass = embedded
    ? "space-y-3"
    : "rounded-xl border border-border/80 bg-muted/30 p-4";

  return (
    <div id="telegram" className={wrapperClass}>
      {!embedded ? (
        <div className="flex items-start gap-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-accent/10 text-accent">
            <MessageCircle className="h-4 w-4" aria-hidden />
          </span>
          <div className="min-w-0 space-y-1">
            <p className="text-sm font-medium text-foreground">Telegram-уведомления</p>
            <p className="text-xs text-muted-foreground">
              Дублирует отклики, сообщения в чате и подписки на вакансии. Привязка только
              через бота — chat_id вручную не принимается.
            </p>
          </div>
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">
          Дублирует отклики, чат и подписки на вакансии. Привязка только через бота.
        </p>
      )}

      {isLinked ? (
        <p
          className={cn(
            "inline-flex rounded-full bg-success/10 px-3 py-1 text-xs font-medium text-success",
            !embedded && "mt-3",
          )}
        >
          Telegram подключён
        </p>
      ) : (
        <p className={cn("text-xs text-muted-foreground", !embedded && "mt-3")}>
          Telegram не привязан
        </p>
      )}

      {!isLinked ? (
        <div className={cn("flex flex-wrap gap-2", !embedded && "mt-3")}>
          <Button
            type="button"
            variant="secondary"
            disabled={loading}
            onClick={() => void requestLink()}
          >
            {loading ? "Загрузка…" : "Привязать Telegram"}
          </Button>
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
      ) : null}

      {expired && !isLinked ? (
        <p className="mt-3 rounded-xl border border-border/80 bg-muted/40 px-3 py-2 text-sm text-muted-foreground">
          Ссылка истекла. Нажмите «Привязать Telegram» снова.
        </p>
      ) : null}

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
          {polling && !isLinked ? (
            <p className="text-xs text-accent">Ожидаем Start в Telegram…</p>
          ) : null}
          {secondsLeft != null && secondsLeft > 0 ? (
            <p className="text-xs text-muted-foreground">
              Ссылка действует ещё {Math.floor(secondsLeft / 60)}:
              {String(secondsLeft % 60).padStart(2, "0")}
            </p>
          ) : null}
        </div>
      ) : null}

      {showSlowHint && polling && !isLinked ? (
        <p className="mt-3 rounded-xl border border-border/80 bg-muted/30 px-3 py-2 text-xs leading-relaxed text-muted-foreground">
          Если после Start в боте статус не обновляется, возможна проблема на сервере
          (длинный токен в ссылке). Попробуйте позже или обратитесь в поддержку.
        </p>
      ) : null}
    </div>
  );
}
