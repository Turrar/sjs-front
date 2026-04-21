"use client";

import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { routes } from "@/lib/api-routes";
import { ApiError } from "@/lib/api-base";
import { getApiBase } from "@/lib/api-base";
import type { PublicProfile, SkillBadge } from "@/lib/types";
import { LoadingHint } from "@/components/layout/page";
import { cn } from "@/lib/cn";

function scoreColor(score: number) {
  if (score >= 80) return "bg-success/15 text-success";
  if (score >= 60) return "bg-accent/15 text-accent";
  return "bg-danger/10 text-danger";
}

async function fetchPublic<T>(path: string): Promise<T> {
  const res = await fetch(`${getApiBase()}${path}`);
  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as { message?: string } | null;
    throw new ApiError(res.status, path, body?.message ?? res.statusText);
  }
  return res.json() as Promise<T>;
}

export default function PublicProfilePage() {
  const params = useParams();
  const userId = params.userId as string;

  const [profile, setProfile] = useState<PublicProfile | null>(null);
  const [badges, setBadges] = useState<SkillBadge[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const [profileData, badgesData] = await Promise.all([
          fetchPublic<PublicProfile>(routes.profiles.byUserId(userId)),
          fetchPublic<SkillBadge[]>(routes.skillTests.badgesByUser(userId)).catch(
            () => [] as SkillBadge[],
          ),
        ]);
        if (!cancelled) {
          setProfile(profileData);
          setBadges(badgesData);
        }
      } catch (e) {
        if (!cancelled)
          setError(e instanceof ApiError ? e.message : "Профиль не найден");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [userId]);

  const fullName =
    profile
      ? [profile.firstName, profile.lastName].filter(Boolean).join(" ") || null
      : null;

  return (
    <div className="mx-auto max-w-2xl px-4 py-10 sm:px-6">
      {loading ? (
        <LoadingHint />
      ) : error ? (
        <div className="rounded-2xl border border-danger/30 bg-danger/5 px-6 py-8 text-center">
          <p className="text-lg font-semibold text-danger">Профиль не найден</p>
          <p className="mt-1 text-sm text-muted-foreground">{error}</p>
        </div>
      ) : profile ? (
        <div className="space-y-8">
          {/* Hero */}
          <div className="flex flex-col items-center gap-6 text-center sm:flex-row sm:items-start sm:text-left">
            <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-2xl bg-accent/15 text-3xl font-bold text-accent shadow-sm">
              {(profile.firstName?.[0] ?? profile.userId[0]).toUpperCase()}
            </div>
            <div className="min-w-0">
              {fullName ? (
                <h1 className="text-2xl font-bold tracking-tight text-foreground">
                  {fullName}
                </h1>
              ) : (
                <h1 className="text-xl font-semibold text-muted-foreground">
                  Студент SJS
                </h1>
              )}
              {profile.university ? (
                <p className="mt-1 text-sm text-muted-foreground">
                  {profile.university}
                  {profile.specialty ? ` · ${profile.specialty}` : ""}
                </p>
              ) : null}
              {profile.portfolioUrl ? (
                <a
                  href={profile.portfolioUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-1 inline-block text-sm font-medium text-accent hover:underline"
                >
                  Портфолио →
                </a>
              ) : null}
            </div>
          </div>

          {/* Bio */}
          {profile.bio ? (
            <section className="rounded-2xl border border-border bg-card p-5 shadow-sm">
              <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                О себе
              </h2>
              <p className="text-sm leading-relaxed text-foreground">{profile.bio}</p>
            </section>
          ) : null}

          {/* Badges */}
          {badges.length > 0 ? (
            <section>
              <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                Подтверждённые навыки
              </h2>
              <div className="flex flex-wrap gap-2">
                {badges.map((b) => (
                  <div
                    key={b.id}
                    className={cn(
                      "flex items-center gap-2 rounded-full px-3.5 py-1.5 text-sm font-semibold shadow-sm",
                      scoreColor(b.scorePercent),
                    )}
                  >
                    <span>{b.skill}</span>
                    <span className="tabular-nums opacity-80">{b.scorePercent}%</span>
                  </div>
                ))}
              </div>
            </section>
          ) : null}

          {/* GitHub repos */}
          {profile.githubRepos.length > 0 ? (
            <section>
              <div className="mb-3 flex items-center gap-2">
                <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                  GitHub
                </h2>
                {profile.githubUsername ? (
                  <a
                    href={`https://github.com/${profile.githubUsername}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs font-medium text-accent hover:underline"
                  >
                    @{profile.githubUsername}
                  </a>
                ) : null}
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                {profile.githubRepos.map((repo) => (
                  <a
                    key={repo.name}
                    href={repo.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group flex flex-col gap-1.5 rounded-2xl border border-border bg-card p-4 shadow-sm transition-[border-color,box-shadow] hover:border-accent/30 hover:shadow-md"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <span className="text-sm font-semibold text-foreground group-hover:text-accent">
                        {repo.name}
                      </span>
                      {repo.stars > 0 ? (
                        <span className="shrink-0 rounded-full bg-amber-400/15 px-2 py-0.5 text-xs font-medium text-amber-700">
                          ★ {repo.stars}
                        </span>
                      ) : null}
                    </div>
                    {repo.description ? (
                      <p className="line-clamp-2 text-xs text-muted-foreground">
                        {repo.description}
                      </p>
                    ) : null}
                    <div className="mt-auto flex flex-wrap gap-1.5 text-xs">
                      {repo.language ? (
                        <span className="rounded-md bg-muted/70 px-2 py-0.5 text-muted-foreground">
                          {repo.language}
                        </span>
                      ) : null}
                      <span className="rounded-md bg-muted/70 px-2 py-0.5 text-muted-foreground">
                        {new Date(repo.updatedAt).toLocaleDateString()}
                      </span>
                    </div>
                  </a>
                ))}
              </div>
            </section>
          ) : null}

          {/* Footer */}
          <p className="text-center text-xs text-muted-foreground">
            На платформе с{" "}
            {new Date(profile.createdAt).toLocaleDateString("ru-RU", {
              year: "numeric",
              month: "long",
            })}
          </p>
        </div>
      ) : null}
    </div>
  );
}
