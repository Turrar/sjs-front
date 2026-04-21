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
  LoadingHint,
  PageContainer,
  PageHeader,
} from "@/components/layout/page";
import { cn } from "@/lib/cn";

const linkSecondaryClass =
  "inline-flex shrink-0 items-center justify-center gap-2 rounded-xl border border-border bg-card px-4 py-2.5 text-sm font-medium text-foreground shadow-sm transition-[transform,opacity] hover:bg-muted/80 active:scale-[0.98]";

export default function NotificationsPage() {
  const { api, user } = useSession();
  const [items, setItems] = useState<Notification[]>([]);
  const [error, setError] = useState<string | null>(null);
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
      alert(e instanceof ApiError ? e.message : "Ошибка");
    }
  }

  return (
    <PageContainer narrow>
      <PageHeader
        title="Уведомления"
        description="Новые отклики, сообщения в чате и обновления статусов — без «сырого» JSON."
        action={
          <Button type="button" variant="secondary" onClick={() => void load()}>
            Обновить
          </Button>
        }
      />

      {error ? (
        <p className="mb-6 rounded-xl border border-danger/30 bg-danger/5 px-4 py-3 text-sm text-danger">
          {error}
        </p>
      ) : null}

      {loading ? (
        <LoadingHint />
      ) : (
        <ul className="flex flex-col gap-4">
          {items.map((n) => {
            const p = getNotificationPresentation(n, user?.role);
            return (
              <li key={n.id}>
                <Card
                  className={cn(
                    "transition-colors",
                    !n.readAt &&
                      "border-accent/25 bg-accent/[0.06] ring-1 ring-accent/15",
                  )}
                >
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0 flex-1 space-y-2">
                      <h2 className="text-base font-semibold text-foreground">
                        {p.title}
                      </h2>
                      <p className="text-sm leading-relaxed text-foreground">
                        {p.body}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(n.createdAt).toLocaleString()}
                        {n.readAt
                          ? ` · прочитано ${new Date(n.readAt).toLocaleString()}`
                          : ""}
                      </p>
                    </div>
                    <div className="flex shrink-0 flex-col gap-2 sm:items-end">
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
                          className="sm:min-w-[120px]"
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
