"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { routes } from "@/lib/api-routes";
import { ApiError } from "@/lib/api-base";
import { useSession } from "@/components/providers/session-provider";
import { useToast } from "@/components/providers/toast-provider";
import type { StudentProfile, UserMe } from "@/lib/types";
import { userRoleLabel } from "@/lib/user-display";
import { TELEGRAM_LINKED_MASK } from "@/lib/notification-payload";
import {
  putFileToPresignedUrl,
  requestPresign,
  validateLogoFile,
} from "@/lib/presign-upload";
import { StudentAvatarPicker } from "@/components/profile/student-avatar-picker";
import { TelegramNotificationsSection } from "@/components/profile/telegram-notifications-section";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/cn";

type StudentFormState = {
  firstName: string;
  lastName: string;
  phone: string;
  university: string;
  specialty: string;
  bio: string;
  portfolioUrl: string;
  timezone: string;
  githubUsername: string;
};

function studentProfileFromUser(user: UserMe): StudentProfile | null {
  if (user.profile && "firstName" in user.profile) {
    return user.profile as StudentProfile;
  }
  return null;
}

function formFromProfile(profile: StudentProfile | null): StudentFormState {
  return {
    firstName: profile?.firstName ?? "",
    lastName: profile?.lastName ?? "",
    phone: profile?.phone ?? "",
    university: profile?.university ?? "",
    specialty: profile?.specialty ?? "",
    bio: profile?.bio ?? "",
    portfolioUrl: profile?.portfolioUrl ?? "",
    timezone: profile?.timezone ?? "",
    githubUsername: profile?.githubUsername ?? "",
  };
}

function studentDisplayName(form: StudentFormState, email: string): string {
  const full = [form.firstName, form.lastName].filter(Boolean).join(" ").trim();
  return full || email.split("@")[0] || "Студент";
}

function studentSubtitle(form: StudentFormState): string | null {
  const parts = [form.university, form.specialty].filter(Boolean);
  return parts.length ? parts.join(" · ") : null;
}

type StudentProfileContentProps = {
  user: UserMe;
};

export function StudentProfileContent({ user }: StudentProfileContentProps) {
  const { api, refreshUser } = useSession();
  const toast = useToast();

  const studentProfile = useMemo(() => studentProfileFromUser(user), [user]);

  const [form, setForm] = useState<StudentFormState>(() =>
    formFromProfile(studentProfile),
  );
  const [avatarUrl, setAvatarUrl] = useState<string | null>(
    studentProfile?.avatarUrl ?? null,
  );
  const [saving, setSaving] = useState(false);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const telegramLinked = studentProfile?.telegramChatId === TELEGRAM_LINKED_MASK;
  const publicProfileUrl = `/profiles/${user.id}`;
  const displayName = studentDisplayName(form, user.email);
  const subtitle = studentSubtitle(form);

  useEffect(() => {
    const profile = studentProfileFromUser(user);
    setForm(formFromProfile(profile));
    setAvatarUrl(profile?.avatarUrl ?? null);
  }, [user]);

  async function uploadAvatar(file: File) {
    const validationError = validateLogoFile(file);
    if (validationError) {
      setError(validationError);
      toast.error(validationError);
      return;
    }

    setAvatarUploading(true);
    setError(null);
    try {
      const presign = await requestPresign(api, file);
      await putFileToPresignedUrl(presign.uploadUrl, file);
      const updated = await api.patch<UserMe>(routes.users.me, {
        avatarStorageKey: presign.storageKey,
      });
      const profile = studentProfileFromUser(updated);
      setAvatarUrl(profile?.avatarUrl ?? null);
      await refreshUser();
      toast.success("Аватар обновлён");
    } catch (err) {
      const msg =
        err instanceof ApiError
          ? err.message
          : err instanceof Error
            ? err.message
            : "Ошибка загрузки аватара";
      setError(msg);
      toast.error(msg);
    } finally {
      setAvatarUploading(false);
    }
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await api.patch<UserMe>(routes.users.me, {
        firstName: form.firstName.trim() || undefined,
        lastName: form.lastName.trim() || undefined,
        phone: form.phone.trim() || undefined,
        university: form.university.trim() || undefined,
        specialty: form.specialty.trim() || undefined,
        bio: form.bio.trim() || undefined,
        portfolioUrl: form.portfolioUrl.trim() || undefined,
        timezone: form.timezone.trim() || undefined,
        githubUsername: form.githubUsername.trim() || null,
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
        <div className="flex flex-col gap-5 sm:flex-row sm:items-start">
          <StudentAvatarPicker
            avatarUrl={avatarUrl}
            firstName={form.firstName}
            lastName={form.lastName}
            email={user.email}
            uploading={avatarUploading}
            onFileSelect={(file) => void uploadAvatar(file)}
          />

          <div className="min-w-0 flex-1 space-y-3">
            <div>
              <h2 className="text-xl font-semibold tracking-tight text-foreground sm:text-2xl">
                {displayName}
              </h2>
              {subtitle ? (
                <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>
              ) : null}
              <p className="mt-1 text-sm text-muted-foreground">{user.email}</p>
            </div>

            <span
              className={cn(
                "inline-flex rounded-full bg-accent/10 px-2.5 py-0.5 text-xs font-medium text-accent",
              )}
            >
              {userRoleLabel(user.role)}
            </span>

            <div className="flex flex-wrap gap-2 pt-1">
              <Button
                type="button"
                variant="secondary"
                onClick={() => {
                  const url =
                    typeof window !== "undefined"
                      ? `${window.location.origin}${publicProfileUrl}`
                      : publicProfileUrl;
                  void navigator.clipboard.writeText(url);
                  toast.success("Ссылка скопирована");
                }}
              >
                Скопировать ссылку
              </Button>
              <Link
                href={publicProfileUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center rounded-xl border border-border bg-card px-4 py-2.5 text-sm font-medium text-foreground shadow-sm transition-[transform,opacity] hover:bg-muted/80 active:scale-[0.98]"
              >
                Публичный профиль
              </Link>
            </div>
          </div>
        </div>
      </Card>

      <form onSubmit={onSubmit} className="space-y-6">
        <Card>
          <CardTitle>Личные данные</CardTitle>
          <CardDescription className="mb-5">
            Имя и контакты отображаются в откликах и публичном профиле.
          </CardDescription>
          <div className="grid gap-4 sm:grid-cols-2">
            <Input
              label="Имя"
              value={form.firstName}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, firstName: e.target.value }))
              }
            />
            <Input
              label="Фамилия"
              value={form.lastName}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, lastName: e.target.value }))
              }
            />
            <div className="sm:col-span-2">
              <Input
                label="Телефон"
                value={form.phone}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, phone: e.target.value }))
                }
              />
            </div>
          </div>
        </Card>

        <Card>
          <CardTitle>Образование</CardTitle>
          <CardDescription className="mb-5">
            Вуз и специальность помогают работодателям лучше понять ваш профиль.
          </CardDescription>
          <div className="grid gap-4 sm:grid-cols-2">
            <Input
              label="Вуз"
              value={form.university}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, university: e.target.value }))
              }
            />
            <Input
              label="Специальность"
              value={form.specialty}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, specialty: e.target.value }))
              }
            />
          </div>
        </Card>

        <Card>
          <CardTitle>О себе и ссылки</CardTitle>
          <CardDescription className="mb-5">
            Краткое описание, портфолио и GitHub — по желанию.
          </CardDescription>
          <div className="space-y-4">
            <Textarea
              label="О себе"
              value={form.bio}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, bio: e.target.value }))
              }
              placeholder="Расскажите о навыках, проектах и целях"
            />
            <div className="grid gap-4 sm:grid-cols-2">
              <Input
                label="Портфолио (URL)"
                type="url"
                value={form.portfolioUrl}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, portfolioUrl: e.target.value }))
                }
                placeholder="https://"
              />
              <Input
                label="GitHub"
                value={form.githubUsername}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    githubUsername: e.target.value,
                  }))
                }
                placeholder="username"
              />
            </div>
            <Input
              label="Часовой пояс"
              value={form.timezone}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, timezone: e.target.value }))
              }
              placeholder="Asia/Almaty"
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

        <Button type="submit" disabled={saving || avatarUploading}>
          {saving ? "Сохранение…" : "Сохранить"}
        </Button>
      </form>
    </div>
  );
}
