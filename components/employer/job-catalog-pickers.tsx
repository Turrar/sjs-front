"use client";

import { useMemo, useState } from "react";
import { X } from "lucide-react";
import type { City, JobCategory, Tag } from "@/lib/types";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/cn";

const pickerListClass =
  "max-h-[min(280px,40vh)] overflow-y-auto rounded-xl border border-border bg-card p-2 shadow-sm";

function categoryLabel(c: JobCategory, all: JobCategory[]): string {
  if (!c.parentId) return c.name;
  const p = all.find((x) => x.id === c.parentId);
  return p ? `${p.name} — ${c.name}` : c.name;
}

function filterByName<T extends { name: string }>(items: T[], q: string): T[] {
  const s = q.trim().toLowerCase();
  if (!s) return items;
  return items.filter((x) => x.name.toLowerCase().includes(s));
}

type CityPickerProps = {
  cities: City[];
  cityId: string;
  onCityId: (id: string) => void;
};

export function JobFormCityPicker({ cities, cityId, onCityId }: CityPickerProps) {
  const [query, setQuery] = useState("");
  const selected = cities.find((c) => c.id === cityId);

  const filtered = useMemo(
    () => filterByName(cities, query),
    [cities, query],
  );

  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-1.5">
        <span className="text-sm font-medium text-foreground">Город</span>
        <p className="text-xs text-muted-foreground">
          Поиск по названию, затем нажмите на город в списке.
        </p>
      </div>

      {selected ? (
        <div className="flex flex-wrap items-center gap-2 rounded-xl border border-accent/30 bg-accent/10 px-3 py-2.5">
          <span className="text-sm font-medium text-foreground">{selected.name}</span>
          <button
            type="button"
            onClick={() => {
              onCityId("");
              setQuery("");
            }}
            className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium text-muted-foreground transition-colors hover:bg-card hover:text-foreground"
          >
            <X className="h-3.5 w-3.5" aria-hidden />
            Сбросить
          </button>
        </div>
      ) : (
        <>
          <Input
            aria-label="Поиск города"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Например: Алматы, Астана…"
            autoComplete="off"
          />
          <div className={pickerListClass}>
            {filtered.length === 0 ? (
              <p className="px-2 py-6 text-center text-sm text-muted-foreground">
                Ничего не найдено. Измените запрос.
              </p>
            ) : (
              <ul className="grid gap-1 sm:grid-cols-2">
                {filtered.map((c) => (
                  <li key={c.id}>
                    <button
                      type="button"
                      onClick={() => {
                        onCityId(c.id);
                        setQuery("");
                      }}
                      className="flex w-full items-center rounded-lg px-3 py-2.5 text-left text-sm transition-colors hover:bg-muted/80"
                    >
                      {c.name}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </>
      )}
    </div>
  );
}

type CategoryPickerProps = {
  categories: JobCategory[];
  categoryIds: Set<string>;
  onToggleCategory: (id: string) => void;
};

export function JobFormCategoryPicker({
  categories,
  categoryIds,
  onToggleCategory,
}: CategoryPickerProps) {
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const s = query.trim().toLowerCase();
    if (!s) return categories;
    return categories.filter((c) =>
      categoryLabel(c, categories).toLowerCase().includes(s),
    );
  }, [categories, query]);

  const selectedList = useMemo(
    () => categories.filter((c) => categoryIds.has(c.id)),
    [categories, categoryIds],
  );

  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-1.5">
        <span className="text-sm font-medium text-foreground">Категории</span>
        <p className="text-xs text-muted-foreground">
          Можно выбрать несколько. Поиск и клик по карточке.
        </p>
      </div>

      {selectedList.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {selectedList.map((c) => (
            <span
              key={c.id}
              className="inline-flex items-center gap-1 rounded-full border border-accent/40 bg-accent/10 pl-3 pr-1 py-1 text-sm text-foreground"
            >
              {categoryLabel(c, categories)}
              <button
                type="button"
                onClick={() => onToggleCategory(c.id)}
                className="rounded-full p-1 text-muted-foreground hover:bg-card hover:text-foreground"
                aria-label={`Убрать ${c.name}`}
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </span>
          ))}
        </div>
      ) : null}

      <Input
        aria-label="Поиск категории"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Поиск категории…"
        autoComplete="off"
      />

      <div className={pickerListClass}>
        {filtered.length === 0 ? (
          <p className="px-2 py-6 text-center text-sm text-muted-foreground">
            Нет совпадений
          </p>
        ) : (
          <ul className="grid gap-2 sm:grid-cols-2">
            {filtered.map((c) => {
              const on = categoryIds.has(c.id);
              return (
                <li key={c.id}>
                  <button
                    type="button"
                    onClick={() => onToggleCategory(c.id)}
                    className={cn(
                      "flex w-full items-center rounded-xl border px-3 py-2.5 text-left text-sm transition-colors",
                      on
                        ? "border-accent bg-accent/15 font-medium text-accent"
                        : "border-border/80 bg-muted/30 hover:border-accent/30 hover:bg-muted/50",
                    )}
                  >
                    <span
                      className={cn(
                        "mr-2 flex h-5 w-5 shrink-0 items-center justify-center rounded border text-xs",
                        on
                          ? "border-accent bg-accent text-accent-foreground"
                          : "border-border bg-card",
                      )}
                    >
                      {on ? "✓" : ""}
                    </span>
                    <span className="leading-snug">{categoryLabel(c, categories)}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}

type TagPickerProps = {
  tags: Tag[];
  tagIds: Set<string>;
  onToggleTag: (id: string) => void;
};

export function JobFormTagPicker({ tags, tagIds, onToggleTag }: TagPickerProps) {
  const [query, setQuery] = useState("");

  const filtered = useMemo(
    () => filterByName(tags, query),
    [tags, query],
  );

  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-1.5">
        <span className="text-sm font-medium text-foreground">Теги</span>
        <p className="text-xs text-muted-foreground">
          Несколько тегов. Сначала поиск — ниже только подходящие.
        </p>
      </div>

      <Input
        aria-label="Поиск тега"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Поиск тега…"
        autoComplete="off"
      />

      <div className="flex flex-wrap gap-2">
        {filtered.length === 0 ? (
          <p className="text-sm text-muted-foreground">Нет совпадений</p>
        ) : (
          filtered.map((t) => {
            const on = tagIds.has(t.id);
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => onToggleTag(t.id)}
                className={cn(
                  "rounded-full border px-3 py-1.5 text-sm font-medium transition-colors",
                  on
                    ? "border-accent bg-accent text-accent-foreground shadow-sm"
                    : "border-border bg-card text-foreground hover:border-accent/40 hover:bg-muted/50",
                )}
              >
                {on ? "✓ " : ""}
                {t.name}
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}
