"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { routes } from "@/lib/api-routes";
import {
  workWindowsFromApi,
  workWindowsToApi,
  WEEKDAY_LABELS,
  type WorkWindowRow,
} from "@/lib/job-form";
import { ApiError } from "@/lib/api-base";
import { RoleGuard } from "@/components/role-guard";
import { useSession } from "@/components/providers/session-provider";
import type { Job, JobFormCatalog, JobStatus } from "@/lib/types";
import {
  JobFormCategoryPicker,
  JobFormCityPicker,
  JobFormTagPicker,
} from "@/components/employer/job-catalog-pickers";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  JobDescriptionEditor,
} from "@/components/employer/job-description-editor";
import {
  ensureJobDescriptionHtml,
  isJobDescriptionEmpty,
} from "@/lib/job-description-html";
import { PremiumBadge } from "@/components/ui/premium-badge";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { PageContainer, PageHeader } from "@/components/layout/page";
import { FormSkeleton } from "@/components/ui/skeleton";
import { Breadcrumb } from "@/components/ui/breadcrumb";
import { useToast } from "@/components/providers/toast-provider";

import { selectClass } from "@/lib/select-class";

const statuses: JobStatus[] = [
  "DRAFT",
  "PUBLISHED",
  "PAUSED",
  "CLOSED",
  "ARCHIVED",
];

export default function EditJobPage() {
  const params = useParams();
  const id = params.id as string;
  const { api } = useSession();

  const [catalog, setCatalog] = useState<JobFormCatalog | null>(null);
  const [job, setJob] = useState<Job | null>(null);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [location, setLocation] = useState("");
  const [cityId, setCityId] = useState("");
  const [categoryIds, setCategoryIds] = useState<Set<string>>(new Set());
  const [tagIds, setTagIds] = useState<Set<string>>(new Set());
  const [salaryMin, setSalaryMin] = useState("");
  const [salaryMax, setSalaryMax] = useState("");
  const [currency, setCurrency] = useState("");
  const [requiredWeeklyHours, setRequiredWeeklyHours] = useState("");
  const [status, setStatus] = useState<JobStatus>("DRAFT");
  const [workRows, setWorkRows] = useState<WorkWindowRow[]>([]);

  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [pending, setPending] = useState(false);
  const toast = useToast();

  const cities = useMemo(() => {
    const list = catalog?.cities ?? [];
    return [...list]
      .filter((c) => c.isActive)
      .sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name));
  }, [catalog]);

  const categories = useMemo(() => {
    const list = catalog?.jobCategories ?? [];
    return [...list]
      .filter((c) => c.isActive)
      .sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name));
  }, [catalog]);

  const tags = useMemo(() => {
    const list = catalog?.tags ?? [];
    return [...list]
      .filter((t) => t.isActive)
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [catalog]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const [cat, j] = await Promise.all([
          api.get<JobFormCatalog>(routes.catalog.jobForm),
          api.get<Job>(routes.jobs.byId(id)),
        ]);
        if (cancelled) return;
        setCatalog(cat);
        setJob(j);
        setTitle(j.title);
        setDescription(ensureJobDescriptionHtml(j.description));
        setLocation(j.location ?? "");
        setCityId(j.cityId ?? "");
        setCategoryIds(new Set(j.categoryIds ?? []));
        setTagIds(new Set(j.tagIds ?? []));
        setSalaryMin(j.salaryMin != null ? String(j.salaryMin) : "");
        setSalaryMax(j.salaryMax != null ? String(j.salaryMax) : "");
        setCurrency(j.currency ?? "");
        setRequiredWeeklyHours(
          j.requiredWeeklyHours != null ? String(j.requiredWeeklyHours) : "",
        );
        setStatus(j.status);
        setWorkRows(workWindowsFromApi(j.workWindows));
      } catch (e) {
        if (!cancelled)
          setError(e instanceof Error ? e.message : "Ошибка загрузки");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id, api]);

  function toggleCategory(cid: string) {
    setCategoryIds((prev) => {
      const next = new Set(prev);
      if (next.has(cid)) next.delete(cid);
      else next.add(cid);
      return next;
    });
  }

  function toggleTag(tid: string) {
    setTagIds((prev) => {
      const next = new Set(prev);
      if (next.has(tid)) next.delete(tid);
      else next.add(tid);
      return next;
    });
  }

  function addWorkRow() {
    setWorkRows((rows) => [
      ...rows,
      {
        key: `new-${Date.now()}-${rows.length}`,
        dayOfWeek: 1,
        start: "09:00",
        end: "18:00",
      },
    ]);
  }

  function updateWorkRow(
    key: string,
    patch: Partial<Pick<WorkWindowRow, "dayOfWeek" | "start" | "end">>,
  ) {
    setWorkRows((rows) =>
      rows.map((r) => (r.key === key ? { ...r, ...patch } : r)),
    );
  }

  function removeWorkRow(key: string) {
    setWorkRows((rows) => rows.filter((r) => r.key !== key));
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (isJobDescriptionEmpty(description)) {
      setError("Заполните описание вакансии.");
      return;
    }
    if (description.length > 20000) {
      setError("Описание слишком длинное (максимум 20 000 символов).");
      return;
    }
    setPending(true);
    try {
      const body: Record<string, unknown> = {
        title,
        description,
        location: location || undefined,
        status,
        currency: currency || undefined,
        cityId: cityId || null,
        categoryIds: [...categoryIds],
        tagIds: [...tagIds],
      };
      if (salaryMin !== "") {
        const v = parseInt(salaryMin, 10);
        if (Number.isNaN(v)) {
          setError("Зарплата «от» должна быть числом.");
          return;
        }
        body.salaryMin = v;
      }
      if (salaryMax !== "") {
        const v = parseInt(salaryMax, 10);
        if (Number.isNaN(v)) {
          setError("Зарплата «до» должна быть числом.");
          return;
        }
        body.salaryMax = v;
      }
      if (requiredWeeklyHours !== "")
        body.requiredWeeklyHours = parseInt(requiredWeeklyHours, 10);
      body.workWindows =
        workRows.length > 0 ? workWindowsToApi(workRows) : [];
      const updated = await api.patch<Job>(routes.jobs.byId(id), body);
      setJob(updated);
      toast.success("Вакансия сохранена");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Ошибка сохранения");
    } finally {
      setPending(false);
    }
  }

  if (loading) {
    return (
      <RoleGuard allow={["EMPLOYER"]}>
        <PageContainer narrow>
          <FormSkeleton fields={10} />
        </PageContainer>
      </RoleGuard>
    );
  }

  if (error && !job) {
    return (
      <RoleGuard allow={["EMPLOYER"]}>
        <PageContainer narrow>
          <Card className="border-danger/25 bg-danger/5">
            <p className="text-sm text-danger">{error}</p>
            <Link
              href="/employer/jobs"
              className="mt-4 inline-flex text-sm font-medium text-accent underline-offset-4 hover:underline"
            >
              ← К списку вакансий
            </Link>
          </Card>
        </PageContainer>
      </RoleGuard>
    );
  }

  return (
    <RoleGuard allow={["EMPLOYER"]}>
      <PageContainer narrow>
        <Breadcrumb
          items={[
            { label: "Мои вакансии", href: "/employer/jobs" },
            { label: title || "Редактирование" },
          ]}
        />
        <PageHeader
          title="Редактирование вакансии"
          description="Обновите данные и смените статус на «Опубликована», когда вакансия готова к показу студентам."
        />
        <Card>
          <CardTitle as="h2">Форма</CardTitle>
          <CardDescription className="mb-6">
            Изменения сохраняются на сервере по кнопке ниже.
          </CardDescription>
          <form onSubmit={onSubmit} className="space-y-5">
            <Input
              label="Название"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              maxLength={200}
            />
            <JobDescriptionEditor
              label="Описание"
              value={description}
              onChange={setDescription}
              maxLength={20000}
              required
              disabled={pending}
            />
            <Input
              label="Локация (доп. текст)"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
            />

            {catalog ? (
              <>
                <div className="rounded-2xl border border-border/80 bg-muted/20 p-4 sm:p-5">
                  <JobFormCityPicker
                    cities={cities}
                    cityId={cityId}
                    onCityId={setCityId}
                  />
                </div>
                <div className="rounded-2xl border border-border/80 bg-muted/20 p-4 sm:p-5">
                  <JobFormCategoryPicker
                    categories={categories}
                    categoryIds={categoryIds}
                    onToggleCategory={toggleCategory}
                  />
                </div>
                <div className="rounded-2xl border border-border/80 bg-muted/20 p-4 sm:p-5">
                  <JobFormTagPicker
                    tags={tags}
                    tagIds={tagIds}
                    onToggleTag={toggleTag}
                  />
                </div>
              </>
            ) : null}

            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium text-foreground">
                Статус
              </label>
              <select
                className={selectClass}
                value={status}
                onChange={(e) => setStatus(e.target.value as JobStatus)}
              >
                {statuses.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid gap-5 sm:grid-cols-3">
              <Input
                label="Зарплата от"
                type="number"
                value={salaryMin}
                onChange={(e) => setSalaryMin(e.target.value)}
              />
              <Input
                label="Зарплата до"
                type="number"
                value={salaryMax}
                onChange={(e) => setSalaryMax(e.target.value)}
              />
              <Input
                label="Валюта"
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
                maxLength={3}
              />
            </div>
            <Input
              label="Часов в неделю"
              type="number"
              value={requiredWeeklyHours}
              onChange={(e) => setRequiredWeeklyHours(e.target.value)}
            />

            {job?.isPremium ? (
              <div className="flex flex-wrap items-center gap-3 rounded-xl border border-border/80 bg-muted/40 px-4 py-3 text-sm">
                <PremiumBadge />
                <span className="text-muted-foreground">
                  Премиум активен.{" "}
                  <Link href="/employer/jobs" className="font-medium text-accent hover:underline">
                    Продлить или продвинуть
                  </Link>
                </span>
              </div>
            ) : (
              <p className="rounded-xl border border-border/80 bg-muted/40 px-4 py-3 text-sm text-muted-foreground">
                Премиум-размещение доступно на{" "}
                <Link href="/employer/jobs" className="font-medium text-accent hover:underline">
                  странице вакансий
                </Link>
                .
              </p>
            )}

            <div className="space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-sm font-medium text-foreground">
                  Окна работы
                </span>
                <Button type="button" variant="secondary" onClick={addWorkRow}>
                  Добавить окно
                </Button>
              </div>
              {workRows.map((row) => (
                <div
                  key={row.key}
                  className="flex flex-wrap items-end gap-2 rounded-xl border border-border/80 bg-muted/20 p-3"
                >
                  <div className="min-w-[120px] flex-1">
                    <span className="mb-1 block text-xs text-muted-foreground">
                      День
                    </span>
                    <select
                      className={selectClass}
                      value={row.dayOfWeek}
                      onChange={(e) =>
                        updateWorkRow(row.key, {
                          dayOfWeek: parseInt(e.target.value, 10),
                        })
                      }
                    >
                      {WEEKDAY_LABELS.map((label, d) => (
                        <option key={label} value={d}>
                          {label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="min-w-[100px]">
                    <span className="mb-1 block text-xs text-muted-foreground">
                      С
                    </span>
                    <input
                      type="time"
                      className={selectClass}
                      value={row.start}
                      onChange={(e) =>
                        updateWorkRow(row.key, { start: e.target.value })
                      }
                    />
                  </div>
                  <div className="min-w-[100px]">
                    <span className="mb-1 block text-xs text-muted-foreground">
                      До
                    </span>
                    <input
                      type="time"
                      className={selectClass}
                      value={row.end}
                      onChange={(e) =>
                        updateWorkRow(row.key, { end: e.target.value })
                      }
                    />
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    className="shrink-0 text-danger"
                    onClick={() => removeWorkRow(row.key)}
                  >
                    Удалить
                  </Button>
                </div>
              ))}
            </div>

            {error ? (
              <p className="rounded-xl border border-danger/30 bg-danger/5 px-3 py-2 text-sm text-danger">
                {error}
              </p>
            ) : null}
            <Button type="submit" disabled={pending} className="mt-2">
              {pending ? "Сохранение…" : "Сохранить"}
            </Button>
          </form>
        </Card>
      </PageContainer>
    </RoleGuard>
  );
}
