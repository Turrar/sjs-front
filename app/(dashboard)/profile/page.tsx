"use client";

import { useEffect, useState } from "react";
import { routes } from "@/lib/api-routes";
import { ApiError } from "@/lib/api-base";
import { useSession } from "@/components/providers/session-provider";
import type { EmployerProfile, StudentProfile, UserMe } from "@/lib/types";
import {
  putFileToPresignedUrl,
  requestPresign,
} from "@/lib/presign-upload";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { PageContainer, PageHeader } from "@/components/layout/page";

export default function ProfilePage() {
  const { user, api, refreshUser } = useSession();
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [student, setStudent] = useState<Partial<StudentProfile>>({});
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [employer, setEmployer] = useState<{
    companyName: string;
    companyDescription: string;
    website: string;
    telegramChatId: string;
  }>({ companyName: "", companyDescription: "", website: "", telegramChatId: "" });
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoUploading, setLogoUploading] = useState(false);
  const [logoStorageKey, setLogoStorageKey] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    if (user.role === "STUDENT" && user.profile && "firstName" in user.profile) {
      setStudent(user.profile as StudentProfile);
    }
    if (
      user.role === "EMPLOYER" &&
      user.profile &&
      "companyName" in user.profile
    ) {
      const p = user.profile as EmployerProfile;
      setEmployer({
        companyName: p.companyName ?? "",
        companyDescription: p.description ?? "",
        website: p.website ?? "",
        telegramChatId: p.telegramChatId ?? "",
      });
      setLogoStorageKey(p.logoStorageKey ?? null);
    }
  }, [user]);

  async function uploadLogo() {
    if (!user || user.role !== "EMPLOYER" || !logoFile) return;
    setLogoUploading(true);
    setError(null);
    setMessage(null);
    try {
      const presign = await requestPresign(api, logoFile);
      await putFileToPresignedUrl(presign.uploadUrl, logoFile);
      await api.patch<UserMe>(routes.users.me, { logoStorageKey: presign.storageKey });
      setLogoFile(null);
      setLogoStorageKey(presign.storageKey);
      await refreshUser();
      setMessage("Логотип обновлён.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка загрузки логотипа");
    } finally {
      setLogoUploading(false);
    }
  }

  async function uploadAvatar() {
    if (!user || user.role !== "STUDENT" || !avatarFile) return;
    setAvatarUploading(true);
    setError(null);
    setMessage(null);
    try {
      const presign = await requestPresign(api, avatarFile);
      await putFileToPresignedUrl(presign.uploadUrl, avatarFile);
      await api.patch<UserMe>(routes.users.me, {
        avatarStorageKey: presign.storageKey,
      });
      setAvatarFile(null);
      await refreshUser();
      setMessage("Аватар обновлён.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка загрузки аватара");
    } finally {
      setAvatarUploading(false);
    }
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    setSaving(true);
    setMessage(null);
    setError(null);
    try {
      if (user.role === "STUDENT") {
        await api.patch<UserMe>(routes.users.me, {
          firstName: student.firstName ?? undefined,
          lastName: student.lastName ?? undefined,
          phone: student.phone ?? undefined,
          university: student.university ?? undefined,
          specialty: student.specialty ?? undefined,
          bio: student.bio ?? undefined,
          portfolioUrl: student.portfolioUrl ?? undefined,
          timezone: student.timezone ?? undefined,
          githubUsername: student.githubUsername ?? null,
          telegramChatId:
            student.telegramChatId === "***linked***"
              ? undefined
              : student.telegramChatId ?? null,
        });
      } else if (user.role === "EMPLOYER") {
        await api.patch<UserMe>(routes.users.me, {
          companyName: employer.companyName || undefined,
          companyDescription: employer.companyDescription || undefined,
          website: employer.website || undefined,
          telegramChatId: employer.telegramChatId || null,
        });
      } else {
        setMessage("Профиль администратора не редактируется здесь.");
        setSaving(false);
        return;
      }
      await refreshUser();
      setMessage("Изменения сохранены.");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Ошибка сохранения");
    } finally {
      setSaving(false);
    }
  }

  if (!user) return null;

  const publicProfileUrl =
    user?.role === "STUDENT" && user?.id
      ? `${typeof window !== "undefined" ? window.location.origin : ""}/profiles/${user.id}`
      : null;

  return (
    <PageContainer narrow>
      <PageHeader
        title="Профиль"
        description="Данные аккаунта и поля профиля по роли."
        action={
          publicProfileUrl ? (
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                void navigator.clipboard.writeText(publicProfileUrl);
              }}
            >
              Скопировать ссылку
            </Button>
          ) : undefined
        }
      />

      <Card className="mb-6">
        <CardTitle>Аккаунт</CardTitle>
        <CardDescription className="mt-1">Email и роль нельзя сменить здесь.</CardDescription>
        <div className="mt-4 space-y-1 text-sm">
          <p>
            <span className="text-muted-foreground">Email:</span>{" "}
            <span className="font-medium text-foreground">{user.email}</span>
          </p>
          <p>
            <span className="text-muted-foreground">Роль:</span>{" "}
            <span className="font-medium text-foreground">{user.role}</span>
          </p>
        </div>
      </Card>

      {user.role === "ADMIN" ? (
        <p className="rounded-xl border border-border bg-muted/50 px-4 py-4 text-sm text-muted-foreground">
          Редактирование профиля администратора здесь не требуется.
        </p>
      ) : (
        <Card>
          <CardTitle>Данные профиля</CardTitle>
          <CardDescription className="mb-6 mt-1">
            Заполните поля и нажмите «Сохранить».
          </CardDescription>
          <form onSubmit={onSubmit} className="space-y-5">
            {user.role === "STUDENT" ? (
              <>
                <div className="rounded-xl border border-border/80 bg-muted/30 p-4">
                  <p className="text-sm font-medium text-foreground">Аватар</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Файл загружается в хранилище по presign; ключ сохраняется в профиле.
                  </p>
                  {student.avatarStorageKey ? (
                    <p className="mt-2 break-all font-mono text-xs text-muted-foreground">
                      Текущий ключ: {student.avatarStorageKey}
                    </p>
                  ) : (
                    <p className="mt-2 text-xs text-muted-foreground">
                      Файл ещё не привязан.
                    </p>
                  )}
                  <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-end">
                    <label className="flex min-h-[44px] flex-1 cursor-pointer flex-col justify-center rounded-xl border border-dashed border-border bg-card px-3 py-2">
                      <span className="text-sm">
                        {avatarFile ? avatarFile.name : "Выберите изображение"}
                      </span>
                      <input
                        type="file"
                        className="sr-only"
                        accept="image/*"
                        onChange={(e) =>
                          setAvatarFile(e.target.files?.[0] ?? null)
                        }
                      />
                    </label>
                    <Button
                      type="button"
                      variant="secondary"
                      disabled={!avatarFile || avatarUploading}
                      onClick={() => void uploadAvatar()}
                    >
                      {avatarUploading ? "Загрузка…" : "Загрузить аватар"}
                    </Button>
                  </div>
                </div>
                <Input
                  label="Имя"
                  value={student.firstName ?? ""}
                  onChange={(e) =>
                    setStudent((s) => ({ ...s, firstName: e.target.value }))
                  }
                />
                <Input
                  label="Фамилия"
                  value={student.lastName ?? ""}
                  onChange={(e) =>
                    setStudent((s) => ({ ...s, lastName: e.target.value }))
                  }
                />
                <Input
                  label="Телефон"
                  value={student.phone ?? ""}
                  onChange={(e) =>
                    setStudent((s) => ({ ...s, phone: e.target.value }))
                  }
                />
                <Input
                  label="Вуз"
                  value={student.university ?? ""}
                  onChange={(e) =>
                    setStudent((s) => ({ ...s, university: e.target.value }))
                  }
                />
                <Input
                  label="Специальность"
                  value={student.specialty ?? ""}
                  onChange={(e) =>
                    setStudent((s) => ({ ...s, specialty: e.target.value }))
                  }
                />
                <Textarea
                  label="О себе"
                  value={student.bio ?? ""}
                  onChange={(e) =>
                    setStudent((s) => ({ ...s, bio: e.target.value }))
                  }
                />
                <Input
                  label="Портфолио (URL)"
                  type="url"
                  value={student.portfolioUrl ?? ""}
                  onChange={(e) =>
                    setStudent((s) => ({ ...s, portfolioUrl: e.target.value }))
                  }
                />
                <Input
                  label="Часовой пояс"
                  value={student.timezone ?? ""}
                  onChange={(e) =>
                    setStudent((s) => ({ ...s, timezone: e.target.value }))
                  }
                  placeholder="Asia/Almaty"
                />
                <Input
                  label="GitHub username"
                  value={student.githubUsername ?? ""}
                  onChange={(e) =>
                    setStudent((s) => ({ ...s, githubUsername: e.target.value || null }))
                  }
                  placeholder="octocat"
                />
                <Input
                  label="Telegram Chat ID"
                  value={student.telegramChatId === "***linked***" ? "" : (student.telegramChatId ?? "")}
                  onChange={(e) =>
                    setStudent((s) => ({ ...s, telegramChatId: e.target.value || null }))
                  }
                  placeholder="Вставьте chat_id для уведомлений"
                />
                {student.telegramChatId === "***linked***" ? (
                  <p className="text-xs text-success">
                    Telegram привязан. Чтобы сменить — введите новый chat_id.
                  </p>
                ) : null}
              </>
            ) : (
              <>
                {/* Logo upload */}
                <div className="rounded-xl border border-border/80 bg-muted/30 p-4">
                  <p className="text-sm font-medium text-foreground">Логотип компании</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Файл загружается через presign; ключ сохраняется в профиле.
                  </p>
                  {logoStorageKey ? (
                    <p className="mt-2 break-all font-mono text-xs text-muted-foreground">
                      Текущий ключ: {logoStorageKey}
                    </p>
                  ) : (
                    <p className="mt-2 text-xs text-muted-foreground">Логотип не привязан.</p>
                  )}
                  <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-end">
                    <label className="flex min-h-[44px] flex-1 cursor-pointer flex-col justify-center rounded-xl border border-dashed border-border bg-card px-3 py-2">
                      <span className="text-sm">
                        {logoFile ? logoFile.name : "Выберите изображение"}
                      </span>
                      <input
                        type="file"
                        className="sr-only"
                        accept="image/*"
                        onChange={(e) => setLogoFile(e.target.files?.[0] ?? null)}
                      />
                    </label>
                    <Button
                      type="button"
                      variant="secondary"
                      disabled={!logoFile || logoUploading}
                      onClick={() => void uploadLogo()}
                    >
                      {logoUploading ? "Загрузка…" : "Загрузить логотип"}
                    </Button>
                  </div>
                </div>
                <Input
                  label="Название компании"
                  value={employer.companyName}
                  onChange={(e) =>
                    setEmployer((x) => ({ ...x, companyName: e.target.value }))
                  }
                  required
                />
                <Textarea
                  label="Описание компании"
                  value={employer.companyDescription}
                  onChange={(e) =>
                    setEmployer((x) => ({
                      ...x,
                      companyDescription: e.target.value,
                    }))
                  }
                />
                <Input
                  label="Сайт"
                  type="url"
                  value={employer.website}
                  onChange={(e) =>
                    setEmployer((x) => ({ ...x, website: e.target.value }))
                  }
                />
                <Input
                  label="Telegram Chat ID"
                  value={employer.telegramChatId}
                  onChange={(e) =>
                    setEmployer((x) => ({ ...x, telegramChatId: e.target.value }))
                  }
                  placeholder="Вставьте chat_id для уведомлений"
                />
                {user.profile && "verificationStatus" in user.profile ? (() => {
                  const vs = (user.profile as EmployerProfile).verificationStatus;
                  const vsMap: Record<string, { label: string; cls: string }> = {
                    PENDING:  { label: "На проверке",  cls: "bg-amber-500/10 text-amber-700" },
                    VERIFIED: { label: "Верифицирован", cls: "bg-success/10 text-success" },
                    REJECTED: { label: "Отклонён",     cls: "bg-danger/10 text-danger" },
                  };
                  const badge = vsMap[vs] ?? vsMap.PENDING;
                  return (
                    <p className={`rounded-xl px-4 py-3 text-sm font-medium ${badge.cls}`}>
                      Верификация: {badge.label}
                    </p>
                  );
                })() : null}
              </>
            )}
            {error ? (
              <p className="rounded-xl border border-danger/30 bg-danger/5 px-3 py-2 text-sm text-danger">
                {error}
              </p>
            ) : null}
            {message ? (
              <p className="rounded-xl border border-success/30 bg-success/10 px-3 py-2 text-sm text-success">
                {message}
              </p>
            ) : null}
            <Button type="submit" disabled={saving} className="mt-2">
              {saving ? "Сохранение…" : "Сохранить"}
            </Button>
          </form>
        </Card>
      )}
    </PageContainer>
  );
}
