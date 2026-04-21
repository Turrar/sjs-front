"use client";

import { useCallback, useEffect, useState } from "react";
import { routes } from "@/lib/api-routes";
import { ApiError } from "@/lib/api-base";
import { useSession } from "@/components/providers/session-provider";
import type { GamificationMe, LeaderboardEntry } from "@/lib/types";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import {
  LoadingHint,
  PageContainer,
  PageHeader,
} from "@/components/layout/page";
import { cn } from "@/lib/cn";

const eventLabels: Record<string, string> = {
  PROFILE_FILLED: "Профиль заполнен",
  FIRST_APPLICATION: "Первый отклик",
  FIRST_RESUME: "Первое резюме",
  SCHEDULE_UPLOADED: "Расписание загружено",
  GITHUB_LINKED: "GitHub привязан",
  TELEGRAM_LINKED: "Telegram привязан",
  SKILL_TEST_PASSED: "Тест навыков сдан",
  REVIEW_WRITTEN: "Отзыв о работодателе",
  FIRST_HIRE: "Первая стажировка завершена",
};

const eventPoints: Record<string, number> = {
  PROFILE_FILLED: 50,
  FIRST_APPLICATION: 20,
  FIRST_RESUME: 30,
  SCHEDULE_UPLOADED: 20,
  GITHUB_LINKED: 10,
  TELEGRAM_LINKED: 10,
  SKILL_TEST_PASSED: 25,
  REVIEW_WRITTEN: 15,
  FIRST_HIRE: 100,
};

export default function GamificationPage() {
  const { api, user } = useSession();
  const [me, setMe] = useState<GamificationMe | null>(null);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [meData, lbData] = await Promise.all([
        api.get<GamificationMe>(routes.gamification.me),
        api.get<LeaderboardEntry[]>(`${routes.gamification.leaderboard}?limit=10`),
      ]);
      setMe(meData);
      setLeaderboard(lbData);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Ошибка загрузки");
    } finally {
      setLoading(false);
    }
  }, [api]);

  useEffect(() => {
    void load();
  }, [load]);

  const myRank = leaderboard.findIndex((e) => e.userId === user?.id) + 1;

  return (
    <PageContainer>
      <PageHeader
        title="Достижения"
        description="Выполняйте действия на платформе — зарабатывайте очки и попадайте в топ."
      />

      {error ? (
        <p className="mb-6 rounded-xl border border-danger/30 bg-danger/5 px-4 py-3 text-sm text-danger">
          {error}
        </p>
      ) : null}

      {loading ? (
        <LoadingHint />
      ) : (
        <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
          {/* Left column */}
          <div className="space-y-6">
            {/* Total score */}
            <Card>
              <div className="flex flex-col items-center gap-2 py-4 text-center sm:flex-row sm:justify-between sm:text-left sm:py-0">
                <div>
                  <CardTitle>Мои очки</CardTitle>
                  <CardDescription className="mt-1">
                    {myRank > 0 ? `Место в рейтинге: #${myRank}` : "Пока не в топ-10"}
                  </CardDescription>
                </div>
                <div
                  className={cn(
                    "flex h-24 w-24 shrink-0 items-center justify-center rounded-full text-3xl font-extrabold tabular-nums",
                    (me?.total ?? 0) >= 200
                      ? "bg-accent/15 text-accent"
                      : "bg-muted text-foreground",
                  )}
                >
                  {me?.total ?? 0}
                </div>
              </div>
            </Card>

            {/* What to earn */}
            <Card>
              <CardTitle className="mb-4 text-base">Как заработать очки</CardTitle>
              <ul className="space-y-2">
                {Object.entries(eventLabels).map(([key, label]) => {
                  const earned = me?.history.some((h) => h.event === key);
                  return (
                    <li
                      key={key}
                      className="flex items-center justify-between gap-3 text-sm"
                    >
                      <span
                        className={cn(
                          "flex items-center gap-2",
                          earned ? "text-muted-foreground line-through" : "text-foreground",
                        )}
                      >
                        {earned ? (
                          <span className="text-success">✓</span>
                        ) : (
                          <span className="h-1.5 w-1.5 rounded-full bg-accent/60" />
                        )}
                        {label}
                      </span>
                      <span
                        className={cn(
                          "shrink-0 rounded-full px-2.5 py-0.5 text-xs font-bold tabular-nums",
                          earned
                            ? "bg-muted/50 text-muted-foreground"
                            : "bg-accent/10 text-accent",
                        )}
                      >
                        +{eventPoints[key] ?? "?"} очков
                      </span>
                    </li>
                  );
                })}
              </ul>
            </Card>

            {/* History */}
            {me && me.history.length > 0 ? (
              <Card>
                <CardTitle className="mb-4 text-base">История начислений</CardTitle>
                <ul className="space-y-2">
                  {me.history
                    .slice()
                    .sort(
                      (a, b) =>
                        new Date(b.createdAt).getTime() -
                        new Date(a.createdAt).getTime(),
                    )
                    .map((h) => (
                      <li
                        key={h.id}
                        className="flex items-center justify-between gap-3 text-sm"
                      >
                        <div className="min-w-0">
                          <p className="text-foreground">
                            {eventLabels[h.event] ?? h.event}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {new Date(h.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                        <span className="shrink-0 rounded-full bg-success/10 px-2.5 py-0.5 text-xs font-bold tabular-nums text-success">
                          +{h.points}
                        </span>
                      </li>
                    ))}
                </ul>
              </Card>
            ) : null}
          </div>

          {/* Right column — Leaderboard */}
          <div>
            <Card>
              <CardTitle className="mb-4 text-base">Лидерборд</CardTitle>
              {leaderboard.length === 0 ? (
                <p className="text-sm text-muted-foreground">Пока пусто.</p>
              ) : (
                <ol className="space-y-2">
                  {leaderboard.map((entry, i) => {
                    const isMe = entry.userId === user?.id;
                    return (
                      <li
                        key={entry.userId}
                        className={cn(
                          "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-colors",
                          isMe
                            ? "bg-accent/10 ring-1 ring-accent/25"
                            : "bg-muted/30",
                        )}
                      >
                        <span
                          className={cn(
                            "flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold tabular-nums",
                            i === 0
                              ? "bg-amber-400/80 text-amber-900"
                              : i === 1
                                ? "bg-slate-300/80 text-slate-700"
                                : i === 2
                                  ? "bg-orange-300/80 text-orange-800"
                                  : "bg-muted text-muted-foreground",
                          )}
                        >
                          {i + 1}
                        </span>
                        <span className="flex-1 truncate text-foreground">
                          {isMe ? (
                            <span className="font-semibold text-accent">Вы</span>
                          ) : (
                            entry.email ?? entry.userId.slice(0, 8) + "…"
                          )}
                        </span>
                        <span className="shrink-0 font-bold tabular-nums text-foreground">
                          {entry.total}
                        </span>
                      </li>
                    );
                  })}
                </ol>
              )}
            </Card>
          </div>
        </div>
      )}
    </PageContainer>
  );
}
