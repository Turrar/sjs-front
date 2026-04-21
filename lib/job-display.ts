import type { City, Job, JobCategory } from "@/lib/types";

/** Показ названия города: nameI18n (ru/kk) или name */
export function cityDisplayName(
  city: Pick<City, "name"> & {
    nameI18n?: Record<string, string> | null;
  },
  locale: string = "ru",
): string {
  const i18n = city.nameI18n;
  if (i18n && typeof i18n === "object") {
    const direct = i18n[locale] ?? i18n.ru ?? i18n.kk ?? i18n.en;
    if (direct) return direct;
  }
  return city.name;
}

export function categoryTreeLabel(
  c: JobCategory,
  all: JobCategory[],
): string {
  if (!c.parentId) return c.name;
  const p = all.find((x) => x.id === c.parentId);
  return p ? `${p.name} — ${c.name}` : c.name;
}

/** Чипы для карточки: категории и теги с API, иначе эвристика по полям вакансии */
export function jobCardChipLabels(job: Job): string[] {
  const fromApi = [
    ...(job.categories ?? []).map((c) => c.name),
    ...(job.tags ?? []).map((t) => t.name),
  ];
  if (fromApi.length > 0) {
    return [...new Set(fromApi)].slice(0, 8);
  }
  return jobHeuristicTags(job);
}

function jobHeuristicTags(job: Job): string[] {
  const tags: string[] = [];
  if (job.status === "PUBLISHED") tags.push("Активный набор");
  if (job.requiredWeeklyHours != null) {
    if (job.requiredWeeklyHours <= 20) tags.push("Неполная занятость");
    else if (job.requiredWeeklyHours >= 35) tags.push("Полная занятость");
    else tags.push(`${job.requiredWeeklyHours} ч/нед`);
  }
  if (job.workWindows && job.workWindows.length > 0) tags.push("Окна по времени");
  if (tags.length === 0) tags.push("Вакансия");
  return tags.slice(0, 4);
}

/** Строка зарплаты: диапазон или одна граница */
export function salaryLine(job: Pick<Job, "salaryMin" | "salaryMax" | "currency">): string | null {
  const cur = job.currency ?? "₸";
  if (job.salaryMin != null && job.salaryMax != null) {
    return `${job.salaryMin.toLocaleString("ru")}–${job.salaryMax.toLocaleString("ru")} ${cur}`;
  }
  if (job.salaryMin != null) return `от ${job.salaryMin.toLocaleString("ru")} ${cur}`;
  if (job.salaryMax != null) return `до ${job.salaryMax.toLocaleString("ru")} ${cur}`;
  return null;
}

/** Строка локации: город из связи или текст location */
export function jobLocationLine(job: Job): string | null {
  if (job.city) {
    const cityName = cityDisplayName(job.city);
    if (job.location?.trim()) {
      return `${cityName} · ${job.location.trim()}`;
    }
    return cityName;
  }
  if (job.location?.trim()) return job.location.trim();
  return null;
}
