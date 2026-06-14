"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useSession } from "@/components/providers/session-provider";
import { jobsListPath, routes } from "@/lib/api-routes";
import { fetchPublic } from "@/lib/session-api";
import type { Job, JobFormCatalog, JobCategory } from "@/lib/types";
import { categoryTreeLabel } from "@/lib/job-display";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import {
  EmptyState,
  PageContainer,
  PageHeader,
} from "@/components/layout/page";
import { JobCard } from "@/components/job-card";
import { JobCardSkeletonList } from "@/components/ui/skeleton";
import { cn } from "@/lib/cn";

type ActiveFilters = {
  q: string;
  location: string;
  cityId: string;
  categoryId: string;
  tagId: string;
  compatible: boolean;
};

const emptyFilters: ActiveFilters = {
  q: "",
  location: "",
  cityId: "",
  categoryId: "",
  tagId: "",
  compatible: false,
};

type JobsBrowseContentProps = {
  detailBasePath?: string;
};

type FilterChip = {
  key: keyof ActiveFilters;
  label: string;
};

export function JobsBrowseContent({
  detailBasePath = "/jobs",
}: JobsBrowseContentProps) {
  const { user, accessToken } = useSession();

  const [catalog, setCatalog] = useState<JobFormCatalog | null>(null);
  const [catalogError, setCatalogError] = useState<string | null>(null);

  const [draftQ, setDraftQ] = useState("");
  const [draftLocation, setDraftLocation] = useState("");
  const [draftCityId, setDraftCityId] = useState("");
  const [draftCategoryId, setDraftCategoryId] = useState("");
  const [draftTagId, setDraftTagId] = useState("");
  const [draftCompatible, setDraftCompatible] = useState(false);

  const [active, setActive] = useState<ActiveFilters>(emptyFilters);

  const [jobs, setJobs] = useState<Job[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const role = user?.role;
  const tokenForRequest =
    active.compatible && role === "STUDENT" ? accessToken : undefined;

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await fetchPublic<JobFormCatalog>(
          routes.catalog.jobForm,
          { method: "GET" },
        );
        if (!cancelled) setCatalog(data);
      } catch {
        if (!cancelled) {
          setCatalogError("Не удалось загрузить справочники для фильтров");
          setCatalog(null);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

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

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (active.q.trim()) params.set("q", active.q.trim());
      if (active.location.trim()) params.set("location", active.location.trim());
      if (active.cityId) params.set("cityId", active.cityId);
      if (active.categoryId) params.set("categoryId", active.categoryId);
      if (active.tagId) params.set("tagId", active.tagId);
      if (active.compatible && role === "STUDENT") {
        params.set("compatibleWithSchedule", "true");
      }
      const path = jobsListPath(params);
      const data = await fetchPublic<Job[]>(path, { method: "GET" }, tokenForRequest);
      setJobs(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Ошибка загрузки");
      setJobs([]);
    } finally {
      setLoading(false);
    }
  }, [active, role, tokenForRequest]);

  useEffect(() => {
    void load();
  }, [load]);

  function applyFilters() {
    setActive({
      q: draftQ,
      location: draftLocation,
      cityId: draftCityId,
      categoryId: draftCategoryId,
      tagId: draftTagId,
      compatible: draftCompatible,
    });
  }

  function resetFilters() {
    setDraftQ("");
    setDraftLocation("");
    setDraftCityId("");
    setDraftCategoryId("");
    setDraftTagId("");
    setDraftCompatible(false);
    setActive(emptyFilters);
  }

  function clearFilter(key: keyof ActiveFilters) {
    const nextActive = { ...active, [key]: key === "compatible" ? false : "" };
    setActive(nextActive);
    if (key === "q") setDraftQ("");
    if (key === "location") setDraftLocation("");
    if (key === "cityId") setDraftCityId("");
    if (key === "categoryId") setDraftCategoryId("");
    if (key === "tagId") setDraftTagId("");
    if (key === "compatible") setDraftCompatible(false);
  }

  const activeChips = useMemo((): FilterChip[] => {
    const chips: FilterChip[] = [];
    if (active.q.trim()) chips.push({ key: "q", label: `«${active.q.trim()}»` });
    if (active.location.trim()) {
      chips.push({ key: "location", label: active.location.trim() });
    }
    if (active.cityId) {
      const city = cities.find((c) => c.id === active.cityId);
      chips.push({ key: "cityId", label: city?.name ?? "Город" });
    }
    if (active.categoryId) {
      const cat = categories.find((c) => c.id === active.categoryId);
      chips.push({
        key: "categoryId",
        label: cat ? categoryTreeLabel(cat, categories) : "Категория",
      });
    }
    if (active.tagId) {
      const tag = tags.find((t) => t.id === active.tagId);
      chips.push({ key: "tagId", label: tag?.name ?? "Тег" });
    }
    if (active.compatible) {
      chips.push({ key: "compatible", label: "По расписанию" });
    }
    return chips;
  }, [active, cities, categories, tags]);

  const inCabinet = detailBasePath.startsWith("/dashboard");
  const hasDraftChanges =
    draftQ !== active.q ||
    draftLocation !== active.location ||
    draftCityId !== active.cityId ||
    draftCategoryId !== active.categoryId ||
    draftTagId !== active.tagId ||
    draftCompatible !== active.compatible;

  return (
    <PageContainer className={inCabinet ? "py-6 md:py-8" : "py-10 md:py-12"}>
      <PageHeader
        title="Вакансии"
        description={
          inCabinet
            ? "Подбор с учётом города, категории и расписания."
            : "Публичная лента. Для фильтра по расписанию войдите как студент."
        }
      />

      {catalogError ? (
        <p className="mb-3 text-sm text-muted-foreground">{catalogError}</p>
      ) : null}

      <div className="mb-5 rounded-xl border border-border/70 bg-card p-3 shadow-sm sm:p-4">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-6 xl:grid-cols-12">
          <div className="sm:col-span-2 lg:col-span-2 xl:col-span-3">
            <Input
              label="Поиск"
              value={draftQ}
              onChange={(e) => setDraftQ(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  applyFilters();
                }
              }}
              placeholder="Название вакансии"
              className="py-2"
            />
          </div>
          <div className="sm:col-span-2 lg:col-span-2 xl:col-span-2">
            <Input
              label="Локация"
              value={draftLocation}
              onChange={(e) => setDraftLocation(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  applyFilters();
                }
              }}
              placeholder="Район, адрес"
              className="py-2"
            />
          </div>
          <div className="lg:col-span-2 xl:col-span-2">
            <Select
              label="Город"
              value={draftCityId}
              onChange={(e) => setDraftCityId(e.target.value)}
              disabled={!catalog}
              className="py-2"
            >
              <option value="">Все</option>
              {cities.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </Select>
          </div>
          <div className="lg:col-span-2 xl:col-span-2">
            <Select
              label="Категория"
              value={draftCategoryId}
              onChange={(e) => setDraftCategoryId(e.target.value)}
              disabled={!catalog}
              className="py-2"
            >
              <option value="">Все</option>
              {categories.map((c: JobCategory) => (
                <option key={c.id} value={c.id}>
                  {categoryTreeLabel(c, categories)}
                </option>
              ))}
            </Select>
          </div>
          <div className="lg:col-span-2 xl:col-span-2">
            <Select
              label="Тег"
              value={draftTagId}
              onChange={(e) => setDraftTagId(e.target.value)}
              disabled={!catalog}
              className="py-2"
            >
              <option value="">Все</option>
              {tags.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </Select>
          </div>
          <div className="flex flex-col justify-end gap-2 sm:col-span-2 lg:col-span-6 xl:col-span-3">
            {role === "STUDENT" ? (
              <label className="flex cursor-pointer items-center gap-2 text-sm text-foreground">
                <input
                  type="checkbox"
                  className="h-4 w-4 rounded border-border text-accent focus:ring-accent"
                  checked={draftCompatible}
                  onChange={(e) => setDraftCompatible(e.target.checked)}
                />
                <span>По расписанию</span>
              </label>
            ) : (
              <span className="hidden text-sm text-muted-foreground xl:block" aria-hidden>
                &nbsp;
              </span>
            )}
            <div className="flex gap-2">
              <Button
                type="button"
                className="flex-1 py-2 sm:flex-none"
                onClick={applyFilters}
              >
                {hasDraftChanges ? "Найти" : "Обновить"}
              </Button>
              <Button
                type="button"
                variant="secondary"
                className="py-2"
                onClick={resetFilters}
              >
                Сброс
              </Button>
            </div>
          </div>
        </div>

        {activeChips.length > 0 ? (
          <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-border/60 pt-3">
            <span className="text-xs text-muted-foreground">Активно:</span>
            {activeChips.map((chip) => (
              <button
                key={chip.key}
                type="button"
                onClick={() => clearFilter(chip.key)}
                className={cn(
                  "inline-flex items-center gap-1 rounded-full bg-accent/10 px-2.5 py-0.5 text-xs font-medium text-accent",
                  "hover:bg-accent/15",
                )}
              >
                {chip.label}
                <span aria-hidden>×</span>
              </button>
            ))}
            <button
              type="button"
              onClick={resetFilters}
              className="text-xs text-muted-foreground hover:text-foreground"
            >
              Сбросить всё
            </button>
          </div>
        ) : null}
      </div>

      {!loading && !error ? (
        <p className="mb-4 text-sm text-muted-foreground">
          {jobs.length === 0
            ? "Ничего не найдено"
            : `Найдено: ${jobs.length}`}
        </p>
      ) : null}

      {error ? (
        <p
          className="mb-6 rounded-xl border border-danger/30 bg-danger/5 px-4 py-3 text-sm text-danger"
          role="alert"
        >
          {error}
        </p>
      ) : null}

      {loading ? (
        <JobCardSkeletonList count={3} />
      ) : (
        <div className="flex flex-col gap-4">
          {jobs.map((job) => (
            <JobCard key={job.id} job={job} detailBasePath={detailBasePath} />
          ))}
        </div>
      )}

      {!loading && jobs.length === 0 && !error ? (
        <EmptyState
          title="Ничего не найдено"
          description="Измените фильтры или сбросьте их."
        />
      ) : null}
    </PageContainer>
  );
}
