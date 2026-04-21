"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { routes } from "@/lib/api-routes";
import {
  workWindowsToApi,
  WEEKDAY_LABELS,
  type WorkWindowRow,
} from "@/lib/job-form";
import { ApiError } from "@/lib/api-base";
import { RoleGuard } from "@/components/role-guard";
import { useSession } from "@/components/providers/session-provider";
import type { Job, JobFormCatalog } from "@/lib/types";
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
import { isJobDescriptionEmpty } from "@/lib/job-description-html";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import {
  LoadingHint,
  PageContainer,
  PageHeader,
} from "@/components/layout/page";
const selectClass =
  "w-full rounded-xl border border-border bg-card px-3.5 py-2.5 text-sm shadow-sm outline-none transition-[border-color,box-shadow] focus-visible:border-accent/60 focus-visible:ring-2 focus-visible:ring-ring/25";

export default function NewJobPage() {
  const router = useRouter();
  const { api } = useSession();

  const [catalog, setCatalog] = useState<JobFormCatalog | null>(null);
  const [catalogError, setCatalogError] = useState<string | null>(null);
  const [catalogLoading, setCatalogLoading] = useState(true);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [location, setLocation] = useState("");
  const [cityId, setCityId] = useState("");
  const [categoryIds, setCategoryIds] = useState<Set<string>>(new Set());
  const [tagIds, setTagIds] = useState<Set<string>>(new Set());
  const [salaryMin, setSalaryMin] = useState("");
  const [salaryMax, setSalaryMax] = useState("");
  const [currency, setCurrency] = useState("USD");
  const [requiredWeeklyHours, setRequiredWeeklyHours] = useState("");
  const [isPremium, setIsPremium] = useState(false);
  const [workRows, setWorkRows] = useState<WorkWindowRow[]>([]);

  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const loadCatalog = useCallback(async () => {
    setCatalogLoading(true);
    setCatalogError(null);
    try {
      const data = await api.get<JobFormCatalog>(routes.catalog.jobForm);
      setCatalog(data);
    } catch (e) {
      setCatalogError(
        e instanceof ApiError ? e.message : "Не удалось загрузить справочники",
      );
      setCatalog(null);
    } finally {
      setCatalogLoading(false);
    }
  }, [api]);

  useEffect(() => {
    void loadCatalog();
  }, [loadCatalog]);

  const cities = useMemo(() => {
    const list = catalog?.cities ?? [];
    return [...list].filter((c) => c.isActive).sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name));
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

  function toggleCategory(id: string) {
    setCategoryIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleTag(id: string) {
    setTagIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
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
        location: location.trim() || undefined,
        currency: currency.trim() || undefined,
        isPremium,
      };
      if (cityId) body.cityId = cityId;
      if (categoryIds.size > 0) body.categoryIds = [...categoryIds];
      if (tagIds.size > 0) body.tagIds = [...tagIds];
      if (salaryMin !== "") body.salaryMin = parseInt(salaryMin, 10);
      if (salaryMax !== "") body.salaryMax = parseInt(salaryMax, 10);
      if (requiredWeeklyHours !== "")
        body.requiredWeeklyHours = parseInt(requiredWeeklyHours, 10);
      if (workRows.length > 0) {
        body.workWindows = workWindowsToApi(workRows);
      }
      const job = await api.post<Job>(routes.jobs.list, body);
      router.push(`/employer/jobs/${job.id}/edit`);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Ошибка создания");
    } finally {
      setPending(false);
    }
  }

  return (
    <RoleGuard allow={["EMPLOYER"]}>
      <PageContainer narrow>
        <PageHeader
          title="Новая вакансия"
          description="Создаётся как черновик (DRAFT). Справочники: GET /catalog/job-form."
        />

        {catalogLoading ? (
          <LoadingHint />
        ) : catalogError ? (
          <Card className="mb-6 border-danger/25 bg-danger/5">
            <p className="text-sm text-danger">{catalogError}</p>
            <Button
              type="button"
              variant="secondary"
              className="mt-4"
              onClick={() => void loadCatalog()}
            >
              Повторить загрузку
            </Button>
          </Card>
        ) : null}

        {!catalogLoading && catalog ? (
          <Card>
            <CardTitle as="h2">Данные вакансии</CardTitle>
            <CardDescription className="mb-6">
              Обязательны название и описание. Город, категории и теги — из справочников.
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

              <div className="grid gap-4 sm:grid-cols-3">
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
                min={0}
                value={requiredWeeklyHours}
                onChange={(e) => setRequiredWeeklyHours(e.target.value)}
              />

              <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-border/80 bg-muted/40 px-4 py-3 text-sm">
                <input
                  type="checkbox"
                  className="h-4 w-4 rounded border-border text-accent"
                  checked={isPremium}
                  onChange={(e) => setIsPremium(e.target.checked)}
                />
                Премиум-размещение в ленте
              </label>

              <div className="space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-sm font-medium text-foreground">
                    Окна работы (необязательно)
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
              <Button
                type="submit"
                disabled={pending || !catalog}
                className="mt-2"
              >
                {pending ? "Создание…" : "Создать черновик"}
              </Button>
            </form>
          </Card>
        ) : null}
      </PageContainer>
    </RoleGuard>
  );
}
