"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useSession } from "@/components/providers/session-provider";
import { jobsListPath, routes } from "@/lib/api-routes";
import { fetchPublic } from "@/lib/session-api";
import type { Job, JobFormCatalog, JobCategory } from "@/lib/types";
import { categoryTreeLabel } from "@/lib/job-display";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import {
  EmptyState,
  LoadingHint,
  PageContainer,
  PageHeader,
} from "@/components/layout/page";
import { JobCard } from "@/components/job-card";

const selectClass =
  "w-full rounded-xl border border-border bg-card px-3.5 py-2.5 text-sm shadow-sm outline-none transition-[border-color,box-shadow] focus-visible:border-accent/60 focus-visible:ring-2 focus-visible:ring-ring/25";

type ActiveFilters = {
  q: string;
  location: string;
  cityId: string;
  categoryId: string;
  tagId: string;
  compatible: boolean;
};

type JobsBrowseContentProps = {
  detailBasePath?: string;
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

  const [active, setActive] = useState<ActiveFilters>({
    q: "",
    location: "",
    cityId: "",
    categoryId: "",
    tagId: "",
    compatible: false,
  });

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

  const inCabinet = detailBasePath.startsWith("/dashboard");

  return (
    <PageContainer className="py-10 md:py-12">
      <PageHeader
        title="Вакансии"
        description={
          inCabinet
            ? "Лента PUBLISHED: фильтры q, location, cityId, categoryId, tagId; совместимость с расписанием — с JWT студента."
            : "Публичная лента. Для фильтра по расписанию войдите как студент."
        }
      />

      {catalogError ? (
        <p className="mb-4 text-sm text-muted-foreground">{catalogError}</p>
      ) : null}

      <Card className="mb-8">
        <CardTitle>Фильтры</CardTitle>
        <CardDescription className="mb-6">
          Соответствуют query GET /jobs. Нажмите «Применить фильтры», чтобы запросить список снова.
        </CardDescription>
        <div className="grid gap-5 md:grid-cols-2">
          <Input
            label="Поиск по названию (q)"
            value={draftQ}
            onChange={(e) => setDraftQ(e.target.value)}
            placeholder="Подстрока в title"
          />
          <Input
            label="Локация (location)"
            value={draftLocation}
            onChange={(e) => setDraftLocation(e.target.value)}
            placeholder="Подстрока в поле location"
          />
        </div>

        <div className="mt-5 grid gap-5 md:grid-cols-3">
          <div className="flex flex-col gap-2">
            <span className="text-sm font-medium text-foreground">Город (cityId)</span>
            <select
              className={selectClass}
              value={draftCityId}
              onChange={(e) => setDraftCityId(e.target.value)}
              disabled={!catalog}
            >
              <option value="">Все города</option>
              {cities.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-2">
            <span className="text-sm font-medium text-foreground">
              Категория (categoryId)
            </span>
            <select
              className={selectClass}
              value={draftCategoryId}
              onChange={(e) => setDraftCategoryId(e.target.value)}
              disabled={!catalog}
            >
              <option value="">Все категории</option>
              {categories.map((c: JobCategory) => (
                <option key={c.id} value={c.id}>
                  {categoryTreeLabel(c, categories)}
                </option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-2">
            <span className="text-sm font-medium text-foreground">Тег (tagId)</span>
            <select
              className={selectClass}
              value={draftTagId}
              onChange={(e) => setDraftTagId(e.target.value)}
              disabled={!catalog}
            >
              <option value="">Все теги</option>
              {tags.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {role === "STUDENT" ? (
          <label className="mt-5 flex cursor-pointer items-center gap-3 rounded-xl border border-border/80 bg-muted/40 px-4 py-3 text-sm">
            <input
              type="checkbox"
              className="h-4 w-4 rounded border-border text-accent focus:ring-accent"
              checked={draftCompatible}
              onChange={(e) => setDraftCompatible(e.target.checked)}
            />
            <span>Совместимо с моим расписанием (compatibleWithSchedule=true, JWT)</span>
          </label>
        ) : null}
        <Button type="button" className="mt-6" onClick={applyFilters}>
          Применить фильтры
        </Button>
      </Card>

      {error ? (
        <p
          className="mb-6 rounded-xl border border-danger/30 bg-danger/5 px-4 py-3 text-sm text-danger"
          role="alert"
        >
          {error}
        </p>
      ) : null}

      {loading ? (
        <LoadingHint />
      ) : (
        <div className="flex flex-col gap-6">
          {jobs.map((job) => (
            <JobCard key={job.id} job={job} detailBasePath={detailBasePath} />
          ))}
        </div>
      )}

      {!loading && jobs.length === 0 && !error ? (
        <EmptyState
          title="Ничего не найдено"
          description="Попробуйте изменить фильтры или сбросить справочники."
        />
      ) : null}
    </PageContainer>
  );
}
