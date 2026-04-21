"use client";

import {
  useCallback,
  useEffect,
  useState,
  type FormEvent,
} from "react";
import {
  FolderTree,
  Loader2,
  MapPin,
  Pencil,
  Plus,
  Tags as TagsIcon,
  Trash2,
  Upload,
} from "lucide-react";
import { routes } from "@/lib/api-routes";
import { ApiError } from "@/lib/api-base";
import { uploadFileViaPresign } from "@/lib/admin-upload";
import { RoleGuard } from "@/components/role-guard";
import { useSession } from "@/components/providers/session-provider";
import type { City, JobCategory, Tag } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import {
  LoadingHint,
  PageContainer,
  PageHeader,
} from "@/components/layout/page";
import { cn } from "@/lib/cn";

const selectClass =
  "rounded-xl border border-border bg-card px-3 py-2 text-sm shadow-sm outline-none focus-visible:ring-2 focus-visible:ring-ring/25";

function parseList<T>(raw: unknown): T[] {
  if (Array.isArray(raw)) return raw as T[];
  if (
    raw &&
    typeof raw === "object" &&
    "data" in raw &&
    Array.isArray((raw as { data: unknown }).data)
  ) {
    return (raw as { data: T[] }).data;
  }
  return [];
}

type Tab = "cities" | "categories" | "tags";

export default function AdminCatalogPage() {
  const { api } = useSession();
  const [tab, setTab] = useState<Tab>("cities");

  const [cities, setCities] = useState<City[]>([]);
  const [categories, setCategories] = useState<JobCategory[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);

  const [listLoading, setListLoading] = useState(true);
  const [listError, setListError] = useState<string | null>(null);

  const [cityBusy, setCityBusy] = useState(false);
  const [catBusy, setCatBusy] = useState(false);
  const [tagBusy, setTagBusy] = useState(false);

  const [editCity, setEditCity] = useState<City | null>(null);
  const [editCategory, setEditCategory] = useState<JobCategory | null>(null);
  const [editTag, setEditTag] = useState<Tag | null>(null);

  const loadAll = useCallback(async () => {
    setListLoading(true);
    setListError(null);
    try {
      const [c, cat, t] = await Promise.all([
        api.get<unknown>(routes.adminCatalog.cities).then(parseList<City>),
        api.get<unknown>(routes.adminCatalog.jobCategories).then(parseList<JobCategory>),
        api.get<unknown>(routes.adminCatalog.tags).then(parseList<Tag>),
      ]);
      setCities(c);
      setCategories(cat);
      setTags(t);
    } catch (e) {
      setListError(
        e instanceof ApiError
          ? e.message
          : "Не удалось загрузить справочники через /admin/* маршруты.",
      );
      setCities([]);
      setCategories([]);
      setTags([]);
    } finally {
      setListLoading(false);
    }
  }, [api]);

  useEffect(() => {
    void loadAll();
  }, [loadAll]);

  return (
    <RoleGuard allow={["ADMIN"]}>
      <PageContainer>
        <PageHeader
          title="Справочники"
          description="Города, категории вакансий и теги. Изображения: presign, затем storageKey в форме."
        />

        {listError ? (
          <p className="mb-6 rounded-xl border border-danger/30 bg-danger/5 px-4 py-3 text-sm text-danger">
            {listError}
          </p>
        ) : null}

        <div className="mb-8 flex flex-wrap gap-2 border-b border-border pb-4">
          {(
            [
              ["cities", "Города", MapPin] as const,
              ["categories", "Категории", FolderTree] as const,
              ["tags", "Теги", TagsIcon] as const,
            ] as const
          ).map(([id, label, Icon]) => (
            <button
              key={id}
              type="button"
              onClick={() => setTab(id)}
              className={cn(
                "inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium transition-colors",
                tab === id
                  ? "bg-accent text-accent-foreground shadow-sm"
                  : "bg-muted/60 text-foreground hover:bg-muted",
              )}
            >
              <Icon className="h-4 w-4 shrink-0" aria-hidden />
              {label}
            </button>
          ))}
        </div>

        {listLoading ? (
          <LoadingHint />
        ) : (
          <>
            {tab === "cities" ? (
              <CitiesBlock
                api={api}
                cities={cities}
                onRefresh={loadAll}
                busy={cityBusy}
                setBusy={setCityBusy}
                editCity={editCity}
                setEditCity={setEditCity}
              />
            ) : null}
            {tab === "categories" ? (
              <CategoriesBlock
                api={api}
                categories={categories}
                onRefresh={loadAll}
                busy={catBusy}
                setBusy={setCatBusy}
                editCategory={editCategory}
                setEditCategory={setEditCategory}
              />
            ) : null}
            {tab === "tags" ? (
              <TagsBlock
                api={api}
                tags={tags}
                onRefresh={loadAll}
                busy={tagBusy}
                setBusy={setTagBusy}
                editTag={editTag}
                setEditTag={setEditTag}
              />
            ) : null}
          </>
        )}
      </PageContainer>
    </RoleGuard>
  );
}

function CitiesBlock({
  api,
  cities,
  onRefresh,
  busy,
  setBusy,
  editCity,
  setEditCity,
}: {
  api: ReturnType<typeof useSession>["api"];
  cities: City[];
  onRefresh: () => Promise<void>;
  busy: boolean;
  setBusy: (v: boolean) => void;
  editCity: City | null;
  setEditCity: (c: City | null) => void;
}) {
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [sortOrder, setSortOrder] = useState("0");
  const [isActive, setIsActive] = useState(true);
  const [file, setFile] = useState<File | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  const [eName, setEName] = useState("");
  const [eSlug, setESlug] = useState("");
  const [eSort, setESort] = useState("0");
  const [eActive, setEActive] = useState(true);
  const [eFile, setEFile] = useState<File | null>(null);
  const [resetSlug, setResetSlug] = useState(false);

  useEffect(() => {
    if (editCity) {
      setEName(editCity.name);
      setESlug(editCity.slug ?? "");
      setESort(String(editCity.sortOrder ?? 0));
      setEActive(editCity.isActive);
      setEFile(null);
      setResetSlug(false);
    }
  }, [editCity]);

  async function createCity(e: FormEvent) {
    e.preventDefault();
    const n = name.trim();
    if (!n) return;
    setFormError(null);
    setBusy(true);
    try {
      let imageStorageKey: string | undefined;
      if (file) imageStorageKey = await uploadFileViaPresign(api, file);
      await api.post<City>(routes.adminCatalog.cities, {
        name: n,
        slug: slug.trim() || undefined,
        sortOrder: Math.max(0, parseInt(sortOrder, 10) || 0),
        isActive,
        ...(imageStorageKey ? { imageStorageKey } : {}),
      });
      setName("");
      setSlug("");
      setSortOrder("0");
      setIsActive(true);
      setFile(null);
      await onRefresh();
    } catch (err) {
      setFormError(err instanceof ApiError ? err.message : "Ошибка");
    } finally {
      setBusy(false);
    }
  }

  async function saveEdit() {
    if (!editCity) return;
    setBusy(true);
    try {
      let imageStorageKey: string | undefined;
      if (eFile) imageStorageKey = await uploadFileViaPresign(api, eFile);
      const body: Record<string, unknown> = {
        name: eName.trim(),
        sortOrder: Math.max(0, parseInt(eSort, 10) || 0),
        isActive: eActive,
      };
      if (resetSlug) body.slug = null;
      else if (eSlug.trim()) body.slug = eSlug.trim();
      if (imageStorageKey) body.imageStorageKey = imageStorageKey;
      await api.patch<City>(routes.adminCatalog.cityById(editCity.id), body);
      setEditCity(null);
      await onRefresh();
    } catch (err) {
      alert(err instanceof ApiError ? err.message : "Ошибка");
    } finally {
      setBusy(false);
    }
  }

  async function removeCity(c: City) {
    if (!confirm(`Удалить город «${c.name}»?`)) return;
    setBusy(true);
    try {
      await api.delete(routes.adminCatalog.cityById(c.id));
      await onRefresh();
    } catch (err) {
      alert(err instanceof ApiError ? err.message : "Ошибка");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-8">
      <Card>
        <CardTitle as="h2" className="flex items-center gap-2">
          <Plus className="h-5 w-5 text-accent" aria-hidden />
          Новый город
        </CardTitle>
        <CardDescription className="mb-6">
          POST {routes.adminCatalog.cities} — при необходимости выберите файл (presign →
          S3). Список: GET {routes.catalog.cities}.
        </CardDescription>
        <form
          className="grid gap-4 md:grid-cols-2"
          onSubmit={(e) => void createCity(e)}
        >
          <Input
            label="Название"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={200}
          />
          <Input
            label="Slug (опционально)"
            value={slug}
            onChange={(e) => setSlug(e.target.value)}
          />
          <Input
            label="Порядок сортировки"
            type="number"
            min={0}
            value={sortOrder}
            onChange={(e) => setSortOrder(e.target.value)}
          />
          <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-border/80 bg-muted/40 px-4 py-3 text-sm md:col-span-2">
            <input
              type="checkbox"
              className="h-4 w-4 rounded border-border text-accent focus:ring-accent"
              checked={isActive}
              onChange={(e) => setIsActive(e.target.checked)}
            />
            Активен
          </label>
          <div className="md:col-span-2">
            <span className="mb-2 block text-sm font-medium text-foreground">
              Изображение (опционально)
            </span>
            <label className="flex cursor-pointer flex-wrap items-center gap-2 text-sm text-muted-foreground">
              <Upload className="h-4 w-4" aria-hidden />
              <input
                type="file"
                accept="image/*"
                className="text-sm"
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              />
            </label>
          </div>
          {formError ? (
            <p className="md:col-span-2 text-sm text-danger">{formError}</p>
          ) : null}
          <div className="md:col-span-2">
            <Button type="submit" disabled={busy}>
              {busy ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Сохранение…
                </>
              ) : (
                "Создать"
              )}
            </Button>
          </div>
        </form>
      </Card>

      {editCity ? (
        <Card className="border-accent/30">
          <CardTitle as="h2" className="flex items-center gap-2">
            <Pencil className="h-5 w-5 text-accent" aria-hidden />
            Редактирование
          </CardTitle>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <Input
              label="Название"
              value={eName}
              onChange={(e) => setEName(e.target.value)}
            />
            <Input
              label="Slug"
              value={eSlug}
              onChange={(e) => setESlug(e.target.value)}
              disabled={resetSlug}
            />
            <label className="flex cursor-pointer items-center gap-2 text-sm md:col-span-2">
              <input
                type="checkbox"
                checked={resetSlug}
                onChange={(e) => setResetSlug(e.target.checked)}
              />
              Сбросить slug (автогенерация из названия на бэкенде)
            </label>
            <Input
              label="Порядок"
              type="number"
              min={0}
              value={eSort}
              onChange={(e) => setESort(e.target.value)}
            />
            <label className="flex items-center gap-3 rounded-xl border border-border/80 bg-muted/40 px-4 py-3 text-sm">
              <input
                type="checkbox"
                className="h-4 w-4"
                checked={eActive}
                onChange={(e) => setEActive(e.target.checked)}
              />
              Активен
            </label>
            <div className="md:col-span-2">
              <span className="mb-2 block text-sm font-medium">
                Новое изображение (опционально)
              </span>
              <input
                type="file"
                accept="image/*"
                onChange={(e) => setEFile(e.target.files?.[0] ?? null)}
              />
            </div>
            <div className="flex flex-wrap gap-2 md:col-span-2">
              <Button
                type="button"
                onClick={() => void saveEdit()}
                disabled={busy}
              >
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                Сохранить
              </Button>
              <Button
                type="button"
                variant="secondary"
                onClick={() => setEditCity(null)}
              >
                Отмена
              </Button>
            </div>
          </div>
        </Card>
      ) : null}

      <div className="overflow-x-auto rounded-2xl border border-border/90 shadow-sm">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead className="bg-muted/60">
            <tr>
              <th className="p-3 font-semibold">Название</th>
              <th className="p-3 font-semibold">Slug</th>
              <th className="p-3 font-semibold">Порядок</th>
              <th className="p-3 font-semibold">Активен</th>
              <th className="p-3 font-semibold">Ключ изображения</th>
              <th className="p-3 font-semibold" />
            </tr>
          </thead>
          <tbody>
            {cities.map((c) => (
              <tr
                key={c.id}
                className="border-t border-border/80 hover:bg-muted/20"
              >
                <td className="p-3">{c.name}</td>
                <td className="p-3 text-muted-foreground">{c.slug ?? "—"}</td>
                <td className="p-3">{c.sortOrder}</td>
                <td className="p-3">{c.isActive ? "да" : "нет"}</td>
                <td className="max-w-[200px] truncate p-3 text-xs text-muted-foreground">
                  {c.imageStorageKey ?? "—"}
                </td>
                <td className="p-3">
                  <div className="flex gap-1">
                    <Button
                      type="button"
                      variant="secondary"
                      className="px-2 py-1"
                      onClick={() => setEditCity(c)}
                      disabled={busy}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      type="button"
                      variant="danger"
                      className="px-2 py-1"
                      onClick={() => void removeCity(c)}
                      disabled={busy}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function CategoriesBlock({
  api,
  categories,
  onRefresh,
  busy,
  setBusy,
  editCategory,
  setEditCategory,
}: {
  api: ReturnType<typeof useSession>["api"];
  categories: JobCategory[];
  onRefresh: () => Promise<void>;
  busy: boolean;
  setBusy: (v: boolean) => void;
  editCategory: JobCategory | null;
  setEditCategory: (c: JobCategory | null) => void;
}) {
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [parentId, setParentId] = useState("");
  const [sortOrder, setSortOrder] = useState("0");
  const [isActive, setIsActive] = useState(true);
  const [file, setFile] = useState<File | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  const [eName, setEName] = useState("");
  const [eSlug, setESlug] = useState("");
  const [eParent, setEParent] = useState("");
  const [eSort, setESort] = useState("0");
  const [eActive, setEActive] = useState(true);
  const [eFile, setEFile] = useState<File | null>(null);
  const [resetSlug, setResetSlug] = useState(false);

  useEffect(() => {
    if (editCategory) {
      setEName(editCategory.name);
      setESlug(editCategory.slug ?? "");
      setEParent(editCategory.parentId ?? "");
      setESort(String(editCategory.sortOrder ?? 0));
      setEActive(editCategory.isActive);
      setEFile(null);
      setResetSlug(false);
    }
  }, [editCategory]);

  const parentOptions = categories.filter(
    (c) => !editCategory || c.id !== editCategory.id,
  );

  async function createCat(e: FormEvent) {
    e.preventDefault();
    const n = name.trim();
    if (!n) return;
    setFormError(null);
    setBusy(true);
    try {
      let imageStorageKey: string | undefined;
      if (file) imageStorageKey = await uploadFileViaPresign(api, file);
      await api.post<JobCategory>(routes.adminCatalog.jobCategories, {
        name: n,
        slug: slug.trim() || undefined,
        parentId: parentId.trim() || undefined,
        sortOrder: Math.max(0, parseInt(sortOrder, 10) || 0),
        isActive,
        ...(imageStorageKey ? { imageStorageKey } : {}),
      });
      setName("");
      setSlug("");
      setParentId("");
      setSortOrder("0");
      setIsActive(true);
      setFile(null);
      await onRefresh();
    } catch (err) {
      setFormError(err instanceof ApiError ? err.message : "Ошибка");
    } finally {
      setBusy(false);
    }
  }

  async function saveEdit() {
    if (!editCategory) return;
    setBusy(true);
    try {
      let imageStorageKey: string | undefined;
      if (eFile) imageStorageKey = await uploadFileViaPresign(api, eFile);
      const body: Record<string, unknown> = {
        name: eName.trim(),
        sortOrder: Math.max(0, parseInt(eSort, 10) || 0),
        isActive: eActive,
      };
      if (resetSlug) body.slug = null;
      else if (eSlug.trim()) body.slug = eSlug.trim();
      body.parentId = eParent.trim() ? eParent.trim() : null;
      if (imageStorageKey) body.imageStorageKey = imageStorageKey;
      await api.patch<JobCategory>(
        routes.adminCatalog.jobCategoryById(editCategory.id),
        body,
      );
      setEditCategory(null);
      await onRefresh();
    } catch (err) {
      alert(err instanceof ApiError ? err.message : "Ошибка");
    } finally {
      setBusy(false);
    }
  }

  async function removeCat(c: JobCategory) {
    if (!confirm(`Удалить категорию «${c.name}»?`)) return;
    setBusy(true);
    try {
      await api.delete(routes.adminCatalog.jobCategoryById(c.id));
      await onRefresh();
    } catch (err) {
      alert(err instanceof ApiError ? err.message : "Ошибка");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-8">
      <Card>
        <CardTitle as="h2" className="flex items-center gap-2">
          <Plus className="h-5 w-5 text-accent" aria-hidden />
          Новая категория
        </CardTitle>
        <CardDescription className="mb-6">
          POST {routes.adminCatalog.jobCategories} · GET {routes.catalog.jobCategories}
        </CardDescription>
        <form className="grid gap-4 md:grid-cols-2" onSubmit={(e) => void createCat(e)}>
          <Input
            label="Название"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={200}
          />
          <Input
            label="Slug (опционально)"
            value={slug}
            onChange={(e) => setSlug(e.target.value)}
          />
          <div className="flex flex-col gap-2 md:col-span-2">
            <span className="text-sm font-medium">Родительская категория</span>
            <select
              className={selectClass}
              value={parentId}
              onChange={(e) => setParentId(e.target.value)}
            >
              <option value="">Нет (корень)</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
          <Input
            label="Порядок"
            type="number"
            min={0}
            value={sortOrder}
            onChange={(e) => setSortOrder(e.target.value)}
          />
          <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-border/80 bg-muted/40 px-4 py-3 text-sm">
            <input
              type="checkbox"
              className="h-4 w-4"
              checked={isActive}
              onChange={(e) => setIsActive(e.target.checked)}
            />
            Активна
          </label>
          <div className="md:col-span-2">
            <span className="mb-2 block text-sm font-medium">Изображение</span>
            <input
              type="file"
              accept="image/*"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            />
          </div>
          {formError ? (
            <p className="md:col-span-2 text-sm text-danger">{formError}</p>
          ) : null}
          <div className="md:col-span-2">
            <Button type="submit" disabled={busy}>
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Создать
            </Button>
          </div>
        </form>
      </Card>

      {editCategory ? (
        <Card className="border-accent/30">
          <CardTitle as="h2" className="flex items-center gap-2">
            <Pencil className="h-5 w-5 text-accent" aria-hidden />
            Редактирование категории
          </CardTitle>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <Input
              label="Название"
              value={eName}
              onChange={(e) => setEName(e.target.value)}
            />
            <Input
              label="Slug"
              value={eSlug}
              onChange={(e) => setESlug(e.target.value)}
              disabled={resetSlug}
            />
            <label className="flex cursor-pointer items-center gap-2 text-sm md:col-span-2">
              <input
                type="checkbox"
                checked={resetSlug}
                onChange={(e) => setResetSlug(e.target.checked)}
              />
              Сбросить slug
            </label>
            <div className="md:col-span-2 flex flex-col gap-2">
              <span className="text-sm font-medium">Родитель</span>
              <select
                className={selectClass}
                value={eParent}
                onChange={(e) => setEParent(e.target.value)}
              >
                <option value="">Нет (корень)</option>
                {parentOptions.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
            <Input
              label="Порядок"
              type="number"
              min={0}
              value={eSort}
              onChange={(e) => setESort(e.target.value)}
            />
            <label className="flex items-center gap-3 rounded-xl border border-border/80 bg-muted/40 px-4 py-3 text-sm">
              <input
                type="checkbox"
                checked={eActive}
                onChange={(e) => setEActive(e.target.checked)}
              />
              Активна
            </label>
            <div className="md:col-span-2">
              <span className="mb-2 block text-sm font-medium">
                Новое изображение
              </span>
              <input
                type="file"
                accept="image/*"
                onChange={(e) => setEFile(e.target.files?.[0] ?? null)}
              />
            </div>
            <div className="flex flex-wrap gap-2 md:col-span-2">
              <Button type="button" onClick={() => void saveEdit()} disabled={busy}>
                Сохранить
              </Button>
              <Button
                type="button"
                variant="secondary"
                onClick={() => setEditCategory(null)}
              >
                Отмена
              </Button>
            </div>
          </div>
        </Card>
      ) : null}

      <div className="overflow-x-auto rounded-2xl border border-border/90 shadow-sm">
        <table className="w-full min-w-[800px] text-left text-sm">
          <thead className="bg-muted/60">
            <tr>
              <th className="p-3 font-semibold">Название</th>
              <th className="p-3 font-semibold">Slug</th>
              <th className="p-3 font-semibold">Родитель</th>
              <th className="p-3 font-semibold">Порядок</th>
              <th className="p-3 font-semibold">Активна</th>
              <th className="p-3" />
            </tr>
          </thead>
          <tbody>
            {categories.map((c) => {
              const parent = categories.find((x) => x.id === c.parentId);
              return (
                <tr
                  key={c.id}
                  className="border-t border-border/80 hover:bg-muted/20"
                >
                  <td className="p-3">{c.name}</td>
                  <td className="p-3 text-muted-foreground">
                    {c.slug ?? "—"}
                  </td>
                  <td className="p-3 text-muted-foreground">
                    {parent?.name ?? "—"}
                  </td>
                  <td className="p-3">{c.sortOrder}</td>
                  <td className="p-3">{c.isActive ? "да" : "нет"}</td>
                  <td className="p-3">
                    <div className="flex gap-1">
                      <Button
                        type="button"
                        variant="secondary"
                        className="px-2 py-1"
                        onClick={() => setEditCategory(c)}
                        disabled={busy}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        type="button"
                        variant="danger"
                        className="px-2 py-1"
                        onClick={() => void removeCat(c)}
                        disabled={busy}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function TagsBlock({
  api,
  tags,
  onRefresh,
  busy,
  setBusy,
  editTag,
  setEditTag,
}: {
  api: ReturnType<typeof useSession>["api"];
  tags: Tag[];
  onRefresh: () => Promise<void>;
  busy: boolean;
  setBusy: (v: boolean) => void;
  editTag: Tag | null;
  setEditTag: (t: Tag | null) => void;
}) {
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [formError, setFormError] = useState<string | null>(null);

  const [eName, setEName] = useState("");
  const [eSlug, setESlug] = useState("");
  const [eActive, setEActive] = useState(true);
  const [resetSlug, setResetSlug] = useState(false);

  useEffect(() => {
    if (editTag) {
      setEName(editTag.name);
      setESlug(editTag.slug ?? "");
      setEActive(editTag.isActive);
      setResetSlug(false);
    }
  }, [editTag]);

  async function createTag(e: FormEvent) {
    e.preventDefault();
    const n = name.trim();
    if (!n) return;
    setFormError(null);
    setBusy(true);
    try {
      await api.post<Tag>(routes.adminCatalog.tags, {
        name: n,
        slug: slug.trim() || undefined,
        isActive,
      });
      setName("");
      setSlug("");
      setIsActive(true);
      await onRefresh();
    } catch (err) {
      setFormError(err instanceof ApiError ? err.message : "Ошибка");
    } finally {
      setBusy(false);
    }
  }

  async function saveEdit() {
    if (!editTag) return;
    setBusy(true);
    try {
      const body: Record<string, unknown> = {
        name: eName.trim(),
        isActive: eActive,
      };
      if (resetSlug) body.slug = null;
      else if (eSlug.trim()) body.slug = eSlug.trim();
      await api.patch<Tag>(routes.adminCatalog.tagById(editTag.id), body);
      setEditTag(null);
      await onRefresh();
    } catch (err) {
      alert(err instanceof ApiError ? err.message : "Ошибка");
    } finally {
      setBusy(false);
    }
  }

  async function removeTag(t: Tag) {
    if (!confirm(`Удалить тег «${t.name}»?`)) return;
    setBusy(true);
    try {
      await api.delete(routes.adminCatalog.tagById(t.id));
      await onRefresh();
    } catch (err) {
      alert(err instanceof ApiError ? err.message : "Ошибка");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-8">
      <Card>
        <CardTitle as="h2" className="flex items-center gap-2">
          <Plus className="h-5 w-5 text-accent" aria-hidden />
          Новый тег
        </CardTitle>
        <CardDescription className="mb-6">
          POST {routes.adminCatalog.tags} · GET {routes.catalog.tags}
        </CardDescription>
        <form
          className="grid gap-4 md:grid-cols-2"
          onSubmit={(e) => void createTag(e)}
        >
          <Input
            label="Название"
            required
            maxLength={120}
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <Input
            label="Slug (опционально)"
            value={slug}
            onChange={(e) => setSlug(e.target.value)}
          />
          <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-border/80 bg-muted/40 px-4 py-3 text-sm md:col-span-2">
            <input
              type="checkbox"
              className="h-4 w-4"
              checked={isActive}
              onChange={(e) => setIsActive(e.target.checked)}
            />
            Активен
          </label>
          {formError ? (
            <p className="md:col-span-2 text-sm text-danger">{formError}</p>
          ) : null}
          <div className="md:col-span-2">
            <Button type="submit" disabled={busy}>
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Создать
            </Button>
          </div>
        </form>
      </Card>

      {editTag ? (
        <Card className="border-accent/30">
          <CardTitle as="h2" className="flex items-center gap-2">
            <Pencil className="h-5 w-5 text-accent" aria-hidden />
            Редактирование тега
          </CardTitle>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <Input
              label="Название"
              value={eName}
              onChange={(e) => setEName(e.target.value)}
            />
            <Input
              label="Slug"
              value={eSlug}
              onChange={(e) => setESlug(e.target.value)}
              disabled={resetSlug}
            />
            <label className="flex cursor-pointer items-center gap-2 text-sm md:col-span-2">
              <input
                type="checkbox"
                checked={resetSlug}
                onChange={(e) => setResetSlug(e.target.checked)}
              />
              Сбросить slug
            </label>
            <label className="flex items-center gap-3 rounded-xl border border-border/80 bg-muted/40 px-4 py-3 text-sm md:col-span-2">
              <input
                type="checkbox"
                className="h-4 w-4"
                checked={eActive}
                onChange={(e) => setEActive(e.target.checked)}
              />
              Активен
            </label>
            <div className="flex gap-2 md:col-span-2">
              <Button type="button" onClick={() => void saveEdit()} disabled={busy}>
                Сохранить
              </Button>
              <Button
                type="button"
                variant="secondary"
                onClick={() => setEditTag(null)}
              >
                Отмена
              </Button>
            </div>
          </div>
        </Card>
      ) : null}

      <div className="overflow-x-auto rounded-2xl border border-border/90 shadow-sm">
        <table className="w-full min-w-[560px] text-left text-sm">
          <thead className="bg-muted/60">
            <tr>
              <th className="p-3 font-semibold">Название</th>
              <th className="p-3 font-semibold">Slug</th>
              <th className="p-3 font-semibold">Активен</th>
              <th className="p-3" />
            </tr>
          </thead>
          <tbody>
            {tags.map((t) => (
              <tr
                key={t.id}
                className="border-t border-border/80 hover:bg-muted/20"
              >
                <td className="p-3">{t.name}</td>
                <td className="p-3 text-muted-foreground">{t.slug ?? "—"}</td>
                <td className="p-3">{t.isActive ? "да" : "нет"}</td>
                <td className="p-3">
                  <div className="flex gap-1">
                    <Button
                      type="button"
                      variant="secondary"
                      className="px-2 py-1"
                      onClick={() => setEditTag(t)}
                      disabled={busy}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      type="button"
                      variant="danger"
                      className="px-2 py-1"
                      onClick={() => void removeTag(t)}
                      disabled={busy}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
