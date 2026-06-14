"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { routes } from "@/lib/api-routes";
import { ApiError } from "@/lib/api-base";
import { useSession } from "@/components/providers/session-provider";
import type { Notification } from "@/lib/types";
import { getNotificationPresentation } from "@/lib/notification-display";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  EmptyState,
  PageContainer,
  PageHeader,
} from "@/components/layout/page";
import { NotificationCardSkeletonList } from "@/components/ui/skeleton";
import { cn } from "@/lib/cn";

const linkSecondaryClass =
  "inline-flex shrink-0 items-center justify-center gap-2 rounded-xl border border-border bg-card px-4 py-2.5 text-sm font-medium text-foreground shadow-sm transition-[transform,opacity] hover:bg-muted/80 active:scale-[0.98]";

export default function NotificationsPage() {
  const { api, user } = useSession();
  const [items, setItems] = useState<Notification[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.get<Notification[]>(routes.notifications.list);
      setItems(data);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Ошибка");
    } finally {
      setLoading(false);
    }
  }, [api]);

  useEffect(() => {
    void load();
  }, [load]);

  async function markRead(id: string) {
    try {
      const updated = await api.patch<Notification>(
        routes.notifications.markRead(id),
        {},
      );
      setItems((prev) => prev.map((n) => (n.id === id ? updated : n)));
    } catch (e) {
      setActionError(e instanceof ApiError ? e.message : "Ошибка");
    }
  }

  return (
    <PageContainer>
      <PageHeader
        title="Уведомления"
        description="Новые отклики, сообщения в чате и изменения статусов."
        action={
          <Button type="button" variant="secondary" onClick={() => void load()}>
            Обновить
          </Button>
        }
      />

      {actionError ? (
        <p className="mb-6 rounded-xl border border-danger/30 bg-danger/5 px-4 py-3 text-sm text-danger">
          {actionError}
        </p>
      ) : null}

      {error ? (
        <p className="mb-6 rounded-xl border border-danger/30 bg-danger/5 px-4 py-3 text-sm text-danger">
          {error}
        </p>
      ) : null}

      {loading ? (
        <NotificationCardSkeletonList count={5} />
      ) : (
        <ul className="flex flex-col gap-3">
          {items.map((n) => {
            const p = getNotificationPresentation(n, user?.role);
            const createdLabel = new Date(n.createdAt).toLocaleString("ru-RU", {
              day: "2-digit",
              month: "2-digit",
              year: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            });
            const readLabel = n.readAt
              ? new Date(n.readAt).toLocaleString("ru-RU", {
                  day: "2-digit",
                  month: "2-digit",
                  hour: "2-digit",
                  minute: "2-digit",
                })
              : null;
            return (
              <li key={n.id}>
                <Card
                  padding={false}
                  className={cn(
                    "p-4 transition-colors sm:p-5",
                    !n.readAt &&
                      "border-accent/25 bg-accent/[0.06] ring-1 ring-accent/15",
                  )}
                >
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                    <div className="min-w-0 flex-1 space-y-1.5">
                      <div className="flex flex-wrap items-center gap-2">
                        <h2 className="text-base font-semibold text-foreground">
                          {p.title}
                        </h2>
                        {!n.readAt ? (
                          <span className="rounded-full bg-accent/15 px-2 py-0.5 text-[11px] font-medium text-accent">
                            Новое
                          </span>
                        ) : null}
                      </div>
                      <p className="text-sm leading-relaxed text-muted-foreground">
                        {p.body}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {createdLabel}
                        {readLabel ? ` · прочитано ${readLabel}` : ""}
                      </p>
                    </div>
                    <div className="flex shrink-0 flex-wrap items-center gap-2 lg:justify-end">
                      {p.action ? (
                        <Link
                          href={p.action.href}
                          className={linkSecondaryClass}
                        >
                          {p.action.label}
                        </Link>
                      ) : null}
                      {!n.readAt ? (
                        <Button
                          type="button"
                          variant="ghost"
                          onClick={() => void markRead(n.id)}
                        >
                          Прочитано
                        </Button>
                      ) : null}
                    </div>
                  </div>
                </Card>
              </li>
            );
          })}
        </ul>
      )}

      {!loading && items.length === 0 && !error ? (
        <EmptyState
          title="Пока пусто"
          description="Когда появятся новые события, они отобразятся здесь."
        />
      ) : null}
    </PageContainer>
  );
}
