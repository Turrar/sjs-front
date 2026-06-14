"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { routes } from "@/lib/api-routes";
import { ApiError } from "@/lib/api-base";
import { useSession } from "@/components/providers/session-provider";
import { useToast } from "@/components/providers/toast-provider";
import { fetchPublic } from "@/lib/session-api";
import type { EmployerProfile, PublicEmployerProfile, UserMe } from "@/lib/types";
import { verificationStatusBadge } from "@/lib/employer-display";
import { employerRatingLine } from "@/lib/employer-profile-display";
import { TELEGRAM_LINKED_MASK } from "@/lib/notification-payload";
import { BackendGapNote } from "@/components/profile/backend-gap-note";
import { EmployerLogoModal } from "@/components/profile/employer-logo-modal";
import { TelegramNotificationsSection } from "@/components/profile/telegram-notifications-section";
import { EmployerPublicView } from "@/components/employers/employer-public-view";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";

type EmployerFormState = {
  companyName: string;
  companyDescription: string;
  website: string;
};

function collectEmployerBackendGaps(
  user: UserMe,
  employerProfile: EmployerProfile | null,
  publicProfile: PublicEmployerProfile | null,
  publicProfileError: boolean,
): string[] {
  const gaps: string[] = [];

  if (!employerProfile) {
    gaps.push(
      "GET /users/me — для role=EMPLOYER в ответе нужен объект profile с полями компании.",
    );
    return gaps;
  }

  if (employerProfile.verificationStatus == null) {
    gaps.push(
      "GET /users/me — в profile ожидается verificationStatus (PENDING | VERIFIED | REJECTED).",
    );
  }

  if (employerProfile.logoStorageKey && !employerProfile.logoUrl) {
    gaps.push(
      "GET /users/me — при наличии logoStorageKey вернуть presigned logoUrl для превью.",
    );
  }

  if (publicProfileError) {
    gaps.push(
      `GET /profiles/employer/${user.id} — публичный профиль работодателя недоступен.`,
    );
    return gaps;
  }

  if (!publicProfile) return gaps;

  if (typeof publicProfile.reviewCount !== "number") {
    gaps.push("GET /profiles/employer/:userId — добавить reviewCount в ответ.");
  }

  if (publicProfile.reviewCount > 0 && publicProfile.avgRating == null) {
    gaps.push(
      "GET /profiles/employer/:userId — при reviewCount > 0 вернуть avgRating (number).",
    );
  }

  if (!Array.isArray(publicProfile.recentReviews)) {
    gaps.push("GET /profiles/employer/:userId — добавить recentReviews (массив до 5).");
  }

  if (!Array.isArray(publicProfile.publishedJobs)) {
    gaps.push("GET /profiles/employer/:userId — добавить publishedJobs (массив до 20).");
  }

  if (typeof publicProfile.publishedJobsCount !== "number") {
    gaps.push("GET /profiles/employer/:userId — добавить publishedJobsCount.");
  }

  return gaps;
}

function buildPreviewProfile(
  userId: string,
  employerProfile: EmployerProfile | null,
  publicProfile: PublicEmployerProfile | null,
  form: EmployerFormState,
): PublicEmployerProfile | null {
  if (publicProfile) {
    return {
      ...publicProfile,
      companyName: form.companyName || publicProfile.companyName,
      description: form.companyDescription || publicProfile.description,
      website: form.website || publicProfile.website,
      logoUrl: employerProfile?.logoUrl ?? publicProfile.logoUrl,
    };
  }
  if (!employerProfile) return null;
  return {
    userId,
    companyName: form.companyName || employerProfile.companyName,
    description: form.companyDescription || employerProfile.description,
    website: form.website || employerProfile.website,
    logoUrl: employerProfile.logoUrl ?? null,
    verificationStatus: employerProfile.verificationStatus ?? "PENDING",
    avgRating: null,
    reviewCount: 0,
    recentReviews: [],
    publishedJobsCount: 0,
    publishedJobs: [],
    createdAt: new Date().toISOString(),
  };
}

type EmployerProfileContentProps = {
  user: UserMe;
};

export function EmployerProfileContent({ user }: EmployerProfileContentProps) {
  const { api, refreshUser, accessToken } = useSession();
  const toast = useToast();

  const employerProfile = useMemo(() => {
    if (user.profile && "companyName" in user.profile) {
      return user.profile as EmployerProfile;
    }
    return null;
  }, [user.profile]);

  const [form, setForm] = useState<EmployerFormState>({
    companyName: "",
    companyDescription: "",
    website: "",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [publicProfile, setPublicProfile] = useState<PublicEmployerProfile | null>(
    null,
  );
  const [publicProfileError, setPublicProfileError] = useState(false);
  const [logoModalOpen, setLogoModalOpen] = useState(false);
  const [previewModalOpen, setPreviewModalOpen] = useState(false);

  const telegramLinked = employerProfile?.telegramChatId === TELEGRAM_LINKED_MASK;
  const publicCompanyUrl = `/employers/${user.id}`;

  useEffect(() => {
    if (!employerProfile) return;
    setForm({
      companyName: employerProfile.companyName ?? "",
      companyDescription: employerProfile.description ?? "",
      website: employerProfile.website ?? "",
    });
  }, [employerProfile]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const profile = await fetchPublic<PublicEmployerProfile>(
          routes.profiles.employer(user.id),
          { method: "GET" },
          accessToken ?? undefined,
        );
        if (!cancelled) {
          setPublicProfile(profile);
          setPublicProfileError(false);
        }
      } catch {
        if (!cancelled) {
          setPublicProfile(null);
          setPublicProfileError(true);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user.id, accessToken]);

  const backendGaps = useMemo(
    () =>
      collectEmployerBackendGaps(
        user,
        employerProfile,
        publicProfile,
        publicProfileError,
      ),
    [user, employerProfile, publicProfile, publicProfileError],
  );

  const previewProfile = useMemo(
    () => buildPreviewProfile(user.id, employerProfile, publicProfile, form),
    [user.id, employerProfile, publicProfile, form],
  );

  const verificationBadge = employerProfile?.verificationStatus
    ? verificationStatusBadge(employerProfile.verificationStatus)
    : null;

  const companyTitle =
    form.companyName || employerProfile?.companyName || "Компания";

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await api.patch(routes.users.me, {
        companyName: form.companyName.trim() || undefined,
        companyDescription: form.companyDescription.trim() || undefined,
        website: form.website.trim() || undefined,
      });
      await refreshUser();
      toast.success("Изменения сохранены");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Ошибка сохранения");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0 space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-xl font-semibold tracking-tight text-foreground">
                {companyTitle}
              </h2>
              {verificationBadge ? (
                <span
                  className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${verificationBadge.className}`}
                >
                  {verificationBadge.label}
                </span>
              ) : null}
            </div>
            <p className="text-sm text-muted-foreground">{user.email}</p>
            {publicProfile ? (
              <p className="text-sm text-muted-foreground">
                {employerRatingLine(publicProfile.avgRating, publicProfile.reviewCount)}
              </p>
            ) : null}
          </div>
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="secondary" onClick={() => setLogoModalOpen(true)}>
              Логотип
            </Button>
            <Button
              type="button"
              variant="secondary"
              onClick={() => setPreviewModalOpen(true)}
            >
              Предпросмотр
            </Button>
            <Link
              href={publicCompanyUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center rounded-xl border border-border bg-card px-4 py-2.5 text-sm font-medium text-foreground shadow-sm transition-[transform,opacity] hover:bg-muted/80 active:scale-[0.98]"
            >
              Публичная страница
            </Link>
            <Link
              href="/employer/reviews"
              className="inline-flex items-center justify-center rounded-xl border border-border bg-card px-4 py-2.5 text-sm font-medium text-foreground shadow-sm transition-[transform,opacity] hover:bg-muted/80 active:scale-[0.98]"
            >
              Отзывы
            </Link>
          </div>
        </div>
      </Card>

      <BackendGapNote items={backendGaps} />

      <form onSubmit={onSubmit} className="space-y-6">
        <Card>
          <CardTitle>О компании</CardTitle>
          <CardDescription className="mb-5">
            Название, описание и сайт — отображаются на публичной странице и вакансиях.
          </CardDescription>
          <div className="space-y-4">
            <Input
              label="Название компании"
              value={form.companyName}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, companyName: e.target.value }))
              }
              required
            />
            <Textarea
              label="Описание"
              value={form.companyDescription}
              onChange={(e) =>
                setForm((prev) => ({
                  ...prev,
                  companyDescription: e.target.value,
                }))
              }
              placeholder="Кратко расскажите, чем занимается компания"
            />
            <Input
              label="Сайт"
              type="url"
              value={form.website}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, website: e.target.value }))
              }
              placeholder="https://"
            />
          </div>
        </Card>

        <Card>
          <CardTitle>Уведомления</CardTitle>
          <CardDescription className="mb-5">
            Дублирование важных событий в Telegram.
          </CardDescription>
          <TelegramNotificationsSection
            linked={telegramLinked}
            embedded
            onError={(msg) => setError(msg || null)}
          />
        </Card>

        {error ? (
          <p className="rounded-xl border border-danger/30 bg-danger/5 px-3 py-2 text-sm text-danger">
            {error}
          </p>
        ) : null}

        <Button type="submit" disabled={saving}>
          {saving ? "Сохранение…" : "Сохранить"}
        </Button>
      </form>

      <EmployerLogoModal
        open={logoModalOpen}
        onClose={() => setLogoModalOpen(false)}
        logoUrl={employerProfile?.logoUrl}
        logoStorageKey={employerProfile?.logoStorageKey}
        onUpdated={() => refreshUser()}
      />

      <Modal
        open={previewModalOpen}
        onClose={() => setPreviewModalOpen(false)}
        title="Как видят студенты"
        description="Публичная страница компании."
        className="max-w-2xl"
        footer={
          <div className="flex flex-wrap justify-end gap-2">
            <Link
              href={publicCompanyUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center rounded-xl border border-border bg-card px-4 py-2.5 text-sm font-medium text-foreground shadow-sm hover:bg-muted/80"
            >
              Открыть страницу
            </Link>
            <Button type="button" variant="secondary" onClick={() => setPreviewModalOpen(false)}>
              Закрыть
            </Button>
          </div>
        }
      >
        {previewProfile ? (
          <EmployerPublicView profile={previewProfile} jobsHrefPrefix="/jobs" />
        ) : (
          <p className="text-sm text-muted-foreground">
            Заполните профиль компании, чтобы увидеть предпросмотр.
          </p>
        )}
      </Modal>
    </div>
  );
}
