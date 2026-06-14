"use client";

import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { routes } from "@/lib/api-routes";
import { ApiError } from "@/lib/api-base";
import { fetchPublic } from "@/lib/session-api";
import type { PublicEmployerProfile } from "@/lib/types";
import { EmployerPublicPageSections } from "@/components/employers/employer-public-view";
import { DetailPageSkeleton } from "@/components/ui/skeleton";

export default function PublicEmployerPage() {
  const params = useParams();
  const userId = params.userId as string;

  const [profile, setProfile] = useState<PublicEmployerProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await fetchPublic<PublicEmployerProfile>(
          routes.profiles.employer(userId),
        );
        if (!cancelled) setProfile(data);
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof ApiError ? e.message : "Компания не найдена");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [userId]);

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-10 sm:px-6">
      {loading ? (
        <DetailPageSkeleton />
      ) : error ? (
        <div className="rounded-2xl border border-danger/30 bg-danger/5 px-6 py-8 text-center">
          <p className="font-medium text-foreground">Компания не найдена</p>
          <p className="mt-2 text-sm text-muted-foreground">{error}</p>
        </div>
      ) : profile ? (
        <>
          <header className="mb-8 border-b border-border/70 pb-8">
            <h1 className="text-2xl font-semibold tracking-tight text-foreground sm:text-[1.75rem]">
              {profile.companyName}
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Публичный профиль работодателя на SJS
            </p>
          </header>
          <EmployerPublicPageSections profile={profile} jobsHrefPrefix="/jobs" />
        </>
      ) : null}
    </div>
  );
}
