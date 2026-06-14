"use client";

import { useCallback, useEffect, useState } from "react";
import { routes } from "@/lib/api-routes";
import { ApiError } from "@/lib/api-base";
import { useSession } from "@/components/providers/session-provider";
import { useToast } from "@/components/providers/toast-provider";
import type { ApplicationStatus, Notification, VideoRoomResponse } from "@/lib/types";
import { isVideoRoomNotification } from "@/lib/notification-payload";
import { Button } from "@/components/ui/button";
import {
  isVideoInterviewStatus,
  openVideoRoomUrl,
  VIDEO_ROOM_POLL_MS,
} from "@/lib/video-room";

type EmployerVideoInterviewProps = {
  applicationId: string;
  status: ApplicationStatus;
};

export function EmployerVideoInterview({
  applicationId,
  status,
}: EmployerVideoInterviewProps) {
  const { api } = useSession();
  const [room, setRoom] = useState<VideoRoomResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const eligible = isVideoInterviewStatus(status);

  useEffect(() => {
    if (!eligible) {
      setRoom(null);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const res = await api.get<VideoRoomResponse>(
          routes.video.room(applicationId),
        );
        if (!cancelled) setRoom(res);
      } catch {
        if (!cancelled) setRoom(null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [api, applicationId, eligible]);

  async function startOrJoin() {
    setLoading(true);
    setError(null);
    try {
      const res = await api.post<VideoRoomResponse>(
        routes.video.room(applicationId),
      );
      setRoom(res);
      openVideoRoomUrl(res.url);
    } catch (e) {
      setError(
        e instanceof ApiError ? e.message : "Не удалось открыть видеосозвон",
      );
    } finally {
      setLoading(false);
    }
  }

  if (!eligible) return null;

  return (
    <div className="flex flex-col gap-2">
      <Button
        type="button"
        variant="secondary"
        disabled={loading}
        onClick={() => void startOrJoin()}
      >
        {loading
          ? "Подключение…"
          : room
            ? "Войти в созвон"
            : "Начать видеоинтервью"}
      </Button>
      {error ? <p className="text-sm text-danger">{error}</p> : null}
      {room ? (
        <p className="text-xs text-muted-foreground">
          Созвон действует до {new Date(room.expiresAt).toLocaleString()}
        </p>
      ) : null}
    </div>
  );
}

type StudentVideoInterviewProps = {
  applicationId: string;
  status: ApplicationStatus;
};

export function StudentVideoInterview({
  applicationId,
  status,
}: StudentVideoInterviewProps) {
  const { api } = useSession();
  const toast = useToast();
  const [room, setRoom] = useState<VideoRoomResponse | null>(null);
  const [waiting, setWaiting] = useState(false);
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const eligible = isVideoInterviewStatus(status);

  const fetchRoom = useCallback(
    async (silent = false) => {
      if (!eligible) return;
      if (!silent) setChecking(true);
      try {
        const res = await api.get<VideoRoomResponse>(
          routes.video.room(applicationId),
        );
        setRoom(res);
        setWaiting(false);
        setError(null);
      } catch (e) {
        if (e instanceof ApiError && e.status === 404) {
          setRoom(null);
          setWaiting(status === "INTERVIEW");
          setError(null);
        } else {
          setError(
            e instanceof ApiError ? e.message : "Не удалось проверить созвон",
          );
        }
      } finally {
        if (!silent) setChecking(false);
      }
    },
    [api, applicationId, eligible, status],
  );

  const checkNotifications = useCallback(async () => {
    try {
      const list = await api.get<Notification[]>(routes.notifications.list);
      if (list.some((n) => isVideoRoomNotification(n, applicationId))) {
        toast.success("Работодатель открыл видеосозвон");
        await fetchRoom(true);
      }
    } catch {
      /* ignore */
    }
  }, [api, applicationId, fetchRoom, toast]);

  useEffect(() => {
    if (!eligible) {
      setRoom(null);
      setWaiting(false);
      return;
    }
    void fetchRoom();
  }, [eligible, fetchRoom]);

  useEffect(() => {
    if (!eligible || room || !waiting) return;
    const id = window.setInterval(() => {
      void fetchRoom(true);
      void checkNotifications();
    }, VIDEO_ROOM_POLL_MS);
    return () => window.clearInterval(id);
  }, [eligible, room, waiting, fetchRoom, checkNotifications]);

  if (!eligible) return null;

  if (room) {
    return (
      <div className="flex flex-col gap-2">
        <Button
          type="button"
          variant="secondary"
          className="w-full"
          onClick={() => openVideoRoomUrl(room.url)}
        >
          Присоединиться к интервью
        </Button>
        <p className="text-xs text-muted-foreground">
          Созвон действует до {new Date(room.expiresAt).toLocaleString()}
        </p>
      </div>
    );
  }

  if (status === "INTERVIEW") {
    return (
      <div className="flex flex-col gap-2">
        <p className="text-sm text-muted-foreground">
          {checking
            ? "Проверяем доступность созвона…"
            : "Ожидайте — работодатель откроет созвон"}
        </p>
        {error ? <p className="text-sm text-danger">{error}</p> : null}
      </div>
    );
  }

  return null;
}
