"use client";

import { useCallback, useEffect, useState } from "react";
import { routes } from "@/lib/api-routes";
import { ApiError } from "@/lib/api-base";
import { RoleGuard } from "@/components/role-guard";
import { useSession } from "@/components/providers/session-provider";
import type { City, JobAlert, JobAlertCreate, JobAlertPatch, JobCategory, Tag } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import {
  EmptyState,
  LoadingHint,
  PageContainer,
  PageHeader,
} from "@/components/layout/page";
import { cn } from "@/lib/cn";

const selectClass =
  "w-full rounded-xl border border-border bg-card px-3 py-2.5 text-sm shadow-sm outline-none transition-[border-color,box-shadow] focus-visible:border-accent/60 focus-visible:ring-2 focus-visible:ring-ring/25";

type FormState = {
  cityId: string;
  categoryId: string;
  q: string;
  tagIds: string[];
};

const emptyForm: FormState = { cityId: "", categoryId: "", q: "", tagIds: [] };

function AlertCard({
  alert,
  cities,
  categories,
  tags,
  onToggle,
  onDelete,
  onEdit,
}: {
  alert: JobAlert;
  cities: City[];
  categories: JobCategory[];
  tags: Tag[];
  onToggle: () => void;
  onDelete: () => void;
  onEdit: () => void;
}) {
  const city = cities.find((c) => c.id === alert.cityId);
  const category = categories.find((c) => c.id === alert.categoryId);
  const alertTags = tags.filter((t) => alert.tagIds.includes(t.id));

  return (
    <div className="flex flex-col gap-4 rounded-2xl border border-border bg-card p-4 shadow-[var(--shadow-card)] sm:flex-row sm:items-start sm:justify-between">
      <div className="min-w-0 flex-1 space-y-1.5">
        <div className="flex flex-wrap items-center gap-2">
          <span
            className={cn(
              "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
              alert.isActive
                ? "bg-success/10 text-success"
                : "bg-muted/70 text-muted-foreground",
            )}
          >
            {alert.isActive ? "Активна" : "Отключена"}
          </span>
          {city ? (
            <span className="rounded-md bg-muted/60 px-2 py-0.5 text-xs text-muted-foreground">
              {city.name}
            </span>
          ) : null}
          {category ? (
            <span className="rounded-md bg-muted/60 px-2 py-0.5 text-xs text-muted-foreground">
              {category.name}
            </span>
          ) : null}
          {alertTags.map((t) => (
            <span
              key={t.id}
              className="rounded-md bg-accent/10 px-2 py-0.5 text-xs text-accent"
            >
              {t.name}
            </span>
          ))}
        </div>
        {alert.q ? (
          <p className="text-sm text-foreground">
            Ключевое слово: <span className="font-medium">{alert.q}</span>
          </p>
        ) : (
          <p className="text-sm text-muted-foreground">Все вакансии по фильтру</p>
        )}
        {alert.lastNotifiedAt ? (
          <p className="text-xs text-muted-foreground">
            Последнее уведомление:{" "}
            {new Date(alert.lastNotifiedAt).toLocaleString()}
          </p>
        ) : null}
      </div>
      <div className="flex shrink-0 flex-wrap gap-2">
        <Button variant="secondary" className="text-sm" onClick={onEdit}>
          Изменить
        </Button>
        <Button variant="ghost" className="text-sm" onClick={onToggle}>
          {alert.isActive ? "Отключить" : "Включить"}
        </Button>
        <Button variant="danger" className="text-sm" onClick={onDelete}>
          Удалить
        </Button>
      </div>
    </div>
  );
}

export default function JobAlertsPage() {
  const { api } = useSession();
  const [alerts, setAlerts] = useState<JobAlert[]>([]);
  const [cities, setCities] = useState<City[]>([]);
  const [categories, setCategories] = useState<JobCategory[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [alertsData, catalogData] = await Promise.all([
        api.get<JobAlert[]>(routes.jobAlerts.list),
        api.get<{ cities: City[]; jobCategories: JobCategory[]; tags: Tag[] }>(
          routes.catalog.jobForm,
        ),
      ]);
      setAlerts(alertsData);
      setCities(catalogData.cities.filter((c) => c.isActive));
      setCategories(catalogData.jobCategories.filter((c) => c.isActive));
      setTags(catalogData.tags.filter((t) => t.isActive));
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Ошибка загрузки");
    } finally {
      setLoading(false);
    }
  }, [api]);

  useEffect(() => {
    void load();
  }, [load]);

  function openCreate() {
    setEditingId(null);
    setForm(emptyForm);
    setFormError(null);
    setShowForm(true);
  }

  function openEdit(alert: JobAlert) {
    setEditingId(alert.id);
    setForm({
      cityId: alert.cityId ?? "",
      categoryId: alert.categoryId ?? "",
      q: alert.q ?? "",
      tagIds: alert.tagIds ?? [],
    });
    setFormError(null);
    setShowForm(true);
  }

  async function saveAlert() {
    setSaving(true);
    setFormError(null);
    try {
      const body: JobAlertCreate & { isActive?: boolean } = {
        cityId: form.cityId || undefined,
        categoryId: form.categoryId || undefined,
        q: form.q.trim() || undefined,
        tagIds: form.tagIds.length ? form.tagIds : undefined,
      };
      if (editingId) {
        const updated = await api.patch<JobAlert>(
          routes.jobAlerts.byId(editingId),
          body as JobAlertPatch,
        );
        setAlerts((prev) =>
          prev.map((a) => (a.id === editingId ? updated : a)),
        );
      } else {
        const created = await api.post<JobAlert>(routes.jobAlerts.create, body);
        setAlerts((prev) => [created, ...prev]);
      }
      setShowForm(false);
    } catch (e) {
      setFormError(e instanceof ApiError ? e.message : "Ошибка сохранения");
    } finally {
      setSaving(false);
    }
  }

  async function toggleAlert(alert: JobAlert) {
    try {
      const updated = await api.patch<JobAlert>(routes.jobAlerts.byId(alert.id), {
        isActive: !alert.isActive,
      } as JobAlertPatch);
      setAlerts((prev) => prev.map((a) => (a.id === alert.id ? updated : a)));
    } catch {
      /* ignore */
    }
  }

  async function deleteAlert(id: string) {
    if (!confirm("Удалить подписку?")) return;
    try {
      await api.delete(routes.jobAlerts.byId(id));
      setAlerts((prev) => prev.filter((a) => a.id !== id));
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Ошибка удаления");
    }
  }

  function toggleTag(tagId: string) {
    setForm((f) => ({
      ...f,
      tagIds: f.tagIds.includes(tagId)
        ? f.tagIds.filter((id) => id !== tagId)
        : [...f.tagIds, tagId],
    }));
  }

  return (
    <RoleGuard allow={["STUDENT"]}>
      <PageContainer>
        <PageHeader
          title="Подписки на вакансии"
          description="Получайте уведомления, когда появляются новые вакансии по вашим фильтрам."
          action={
            <Button type="button" onClick={openCreate}>
              Новая подписка
            </Button>
          }
        />

        {error ? (
          <p className="mb-6 rounded-xl border border-danger/30 bg-danger/5 px-4 py-3 text-sm text-danger">
            {error}
          </p>
        ) : null}

        {/* Form */}
        {showForm ? (
          <Card className="mb-8">
            <CardTitle as="h2" className="mb-1">
              {editingId ? "Редактировать подписку" : "Новая подписка"}
            </CardTitle>
            <CardDescription className="mb-6">
              Все поля необязательны — пустые фильтры означают «все вакансии».
            </CardDescription>
            <div className="grid gap-5 sm:grid-cols-2">
              <div className="flex flex-col gap-2">
                <label className="text-sm font-medium text-foreground">Город</label>
                <select
                  className={selectClass}
                  value={form.cityId}
                  onChange={(e) => setForm((f) => ({ ...f, cityId: e.target.value }))}
                >
                  <option value="">Любой город</option>
                  {cities.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex flex-col gap-2">
                <label className="text-sm font-medium text-foreground">Категория</label>
                <select
                  className={selectClass}
                  value={form.categoryId}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, categoryId: e.target.value }))
                  }
                >
                  <option value="">Любая категория</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="sm:col-span-2">
                <Input
                  label="Ключевое слово"
                  value={form.q}
                  onChange={(e) => setForm((f) => ({ ...f, q: e.target.value }))}
                  placeholder="Например: frontend, Java, аналитик"
                />
              </div>
              {tags.length > 0 ? (
                <div className="sm:col-span-2">
                  <p className="mb-2 text-sm font-medium text-foreground">Теги</p>
                  <div className="flex flex-wrap gap-2">
                    {tags.map((t) => (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => toggleTag(t.id)}
                        className={cn(
                          "rounded-full px-3 py-1 text-xs font-medium transition-colors",
                          form.tagIds.includes(t.id)
                            ? "bg-accent text-accent-foreground"
                            : "bg-muted/70 text-muted-foreground hover:bg-muted",
                        )}
                      >
                        {t.name}
                      </button>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>
            {formError ? (
              <p className="mt-4 rounded-xl border border-danger/30 bg-danger/5 px-3 py-2 text-sm text-danger">
                {formError}
              </p>
            ) : null}
            <div className="mt-6 flex gap-3">
              <Button type="button" disabled={saving} onClick={() => void saveAlert()}>
                {saving ? "Сохранение…" : "Сохранить"}
              </Button>
              <Button
                type="button"
                variant="ghost"
                onClick={() => setShowForm(false)}
              >
                Отмена
              </Button>
            </div>
          </Card>
        ) : null}

        {loading ? (
          <LoadingHint />
        ) : alerts.length === 0 && !showForm ? (
          <EmptyState
            title="Нет подписок"
            description="Создайте подписку — получайте уведомления о новых вакансиях по вашим фильтрам."
          >
            <Button type="button" onClick={openCreate}>
              Создать подписку
            </Button>
          </EmptyState>
        ) : (
          <ul className="flex flex-col gap-4">
            {alerts.map((alert) => (
              <li key={alert.id}>
                <AlertCard
                  alert={alert}
                  cities={cities}
                  categories={categories}
                  tags={tags}
                  onToggle={() => void toggleAlert(alert)}
                  onDelete={() => void deleteAlert(alert.id)}
                  onEdit={() => openEdit(alert)}
                />
              </li>
            ))}
          </ul>
        )}
      </PageContainer>
    </RoleGuard>
  );
}
