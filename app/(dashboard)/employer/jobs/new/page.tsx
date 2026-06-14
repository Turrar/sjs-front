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
  PageContainer,
  PageHeader,
} from "@/components/layout/page";
import { FormSkeleton } from "@/components/ui/skeleton";
import { Breadcrumb } from "@/components/ui/breadcrumb";
import { JobWizardSteps } from "@/components/employer/job-wizard-steps";
import { useToast } from "@/components/providers/toast-provider";
import { Select } from "@/components/ui/select";

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
  const [currency, setCurrency] = useState("KZT");
  const [requiredWeeklyHours, setRequiredWeeklyHours] = useState("");
  const [workRows, setWorkRows] = useState<WorkWindowRow[]>([]);

  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [step, setStep] = useState(0);
  const toast = useToast();

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

  function validateStep0(): string | null {
    if (!title.trim()) return "Укажите название вакансии.";
    if (isJobDescriptionEmpty(description)) return "Заполните описание вакансии.";
    if (description.length > 20000) return "Описание слишком длинное (максимум 20 000 символов).";
    return null;
  }

  function goNext() {
    setError(null);
    if (step === 0) {
      const err = validateStep0();
      if (err) {
        setError(err);
        return;
      }
    }
    setStep((s) => Math.min(2, s + 1));
  }

  function goBack() {
    setError(null);
    setStep((s) => Math.max(0, s - 1));
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const stepErr = validateStep0();
    if (stepErr) {
      setError(stepErr);
      setStep(0);
      return;
    }
    setPending(true);
    try {
      const body: Record<string, unknown> = {
        title,
        description,
        location: location.trim() || undefined,
        currency: currency.trim() || undefined,
      };
      if (cityId) body.cityId = cityId;
      if (categoryIds.size > 0) body.categoryIds = [...categoryIds];
      if (tagIds.size > 0) body.tagIds = [...tagIds];
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
      if (workRows.length > 0) {
        body.workWindows = workWindowsToApi(workRows);
      }
      const job = await api.post<Job>(routes.jobs.list, body);
      toast.success("Черновик вакансии создан");
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
        <Breadcrumb
          items={[
            { label: "Мои вакансии", href: "/employer/jobs" },
            { label: "Новая вакансия" },
          ]}
        />
        <PageHeader
          title="Новая вакансия"
          description="Создаётся как черновик. Заполните форму по шагам — опубликовать можно после редактирования."
        />

        {catalogLoading ? (
          <FormSkeleton fields={8} />
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
            <JobWizardSteps step={step} />
            <CardTitle as="h2">
              {step === 0 ? "Основная информация" : step === 1 ? "Условия работы" : "Проверка перед созданием"}
            </CardTitle>
            <CardDescription className="mb-6">
              {step === 0
                ? "Название, описание и справочники."
                : step === 1
                  ? "Зарплата, нагрузка и окна работы."
                  : "Проверьте данные и создайте черновик."}
            </CardDescription>
            <form onSubmit={onSubmit} className="space-y-5">
              {step === 0 ? (
                <>
                  <Input label="Название" value={title} onChange={(e) => setTitle(e.target.value)} required maxLength={200} />
                  <JobDescriptionEditor label="Описание" value={description} onChange={setDescription} maxLength={20000} required disabled={pending} />
                  <Input label="Локация (доп. текст)" value={location} onChange={(e) => setLocation(e.target.value)} />
                  <div className="rounded-2xl border border-border/80 bg-muted/20 p-4 sm:p-5">
                    <JobFormCityPicker cities={cities} cityId={cityId} onCityId={setCityId} />
                  </div>
                  <div className="rounded-2xl border border-border/80 bg-muted/20 p-4 sm:p-5">
                    <JobFormCategoryPicker categories={categories} categoryIds={categoryIds} onToggleCategory={toggleCategory} />
                  </div>
                  <div className="rounded-2xl border border-border/80 bg-muted/20 p-4 sm:p-5">
                    <JobFormTagPicker tags={tags} tagIds={tagIds} onToggleTag={toggleTag} />
                  </div>
                </>
              ) : null}

              {step === 1 ? (
                <>
                  <div className="grid gap-4 sm:grid-cols-3">
                    <Input label="Зарплата от" type="number" value={salaryMin} onChange={(e) => setSalaryMin(e.target.value)} />
                    <Input label="Зарплата до" type="number" value={salaryMax} onChange={(e) => setSalaryMax(e.target.value)} />
                    <Input label="Валюта" value={currency} onChange={(e) => setCurrency(e.target.value)} maxLength={3} />
                  </div>
                  <Input label="Часов в неделю" type="number" min={0} value={requiredWeeklyHours} onChange={(e) => setRequiredWeeklyHours(e.target.value)} />
                  <div className="space-y-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="text-sm font-medium text-foreground">Окна работы (необязательно)</span>
                      <Button type="button" variant="secondary" onClick={addWorkRow}>Добавить окно</Button>
                    </div>
                    {workRows.map((row) => (
                      <div key={row.key} className="flex flex-wrap items-end gap-2 rounded-xl border border-border/80 bg-muted/20 p-3">
                        <div className="min-w-[120px] flex-1">
                          <Select label="День" value={String(row.dayOfWeek)} onChange={(e) => updateWorkRow(row.key, { dayOfWeek: parseInt(e.target.value, 10) })}>
                            {WEEKDAY_LABELS.map((label, d) => (
                              <option key={label} value={d}>{label}</option>
                            ))}
                          </Select>
                        </div>
                        <div className="min-w-[100px]">
                          <span className="mb-1 block text-xs text-muted-foreground">С</span>
                          <input type="time" className="w-full rounded-xl border border-border bg-card px-3 py-2 text-sm shadow-sm outline-none focus-visible:ring-2 focus-visible:ring-ring/25" value={row.start} onChange={(e) => updateWorkRow(row.key, { start: e.target.value })} />
                        </div>
                        <div className="min-w-[100px]">
                          <span className="mb-1 block text-xs text-muted-foreground">До</span>
                          <input type="time" className="w-full rounded-xl border border-border bg-card px-3 py-2 text-sm shadow-sm outline-none focus-visible:ring-2 focus-visible:ring-ring/25" value={row.end} onChange={(e) => updateWorkRow(row.key, { end: e.target.value })} />
                        </div>
                        <Button type="button" variant="ghost" className="shrink-0 text-danger" onClick={() => removeWorkRow(row.key)}>Удалить</Button>
                      </div>
                    ))}
                  </div>
                </>
              ) : null}

              {step === 2 ? (
                <div className="space-y-3 rounded-2xl border border-border/80 bg-muted/20 p-5 text-sm">
                  <p><span className="text-muted-foreground">Название:</span> <strong>{title}</strong></p>
                  <p><span className="text-muted-foreground">Город:</span> {cities.find((c) => c.id === cityId)?.name ?? "—"}</p>
                  <p><span className="text-muted-foreground">Категории:</span> {categoryIds.size || "—"}</p>
                  <p><span className="text-muted-foreground">Теги:</span> {tagIds.size || "—"}</p>
                  <p><span className="text-muted-foreground">Зарплата:</span> {salaryMin || salaryMax ? `${salaryMin || "?"} – ${salaryMax || "?"} ${currency}` : "по договорённости"}</p>
                  <p><span className="text-muted-foreground">Часов/нед:</span> {requiredWeeklyHours || "—"}</p>
                  <p><span className="text-muted-foreground">Окон работы:</span> {workRows.length}</p>
                </div>
              ) : null}

              {error ? (
                <p className="rounded-xl border border-danger/30 bg-danger/5 px-3 py-2 text-sm text-danger">{error}</p>
              ) : null}
              <div className="flex flex-wrap gap-3 pt-2">
                {step > 0 ? (
                  <Button type="button" variant="secondary" onClick={goBack} disabled={pending}>Назад</Button>
                ) : null}
                {step < 2 ? (
                  <Button type="button" onClick={goNext} disabled={pending}>Далее</Button>
                ) : (
                  <Button type="submit" disabled={pending}>{pending ? "Создание…" : "Создать черновик"}</Button>
                )}
              </div>
            </form>
          </Card>
        ) : null}
      </PageContainer>
    </RoleGuard>
  );
}
