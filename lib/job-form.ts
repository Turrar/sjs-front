import type { WorkWindow } from "@/lib/types";

export const WEEKDAY_LABELS = [
  "Вс",
  "Пн",
  "Вт",
  "Ср",
  "Чт",
  "Пт",
  "Сб",
] as const;

export function minutesToTimeInput(total: number): string {
  const t = Math.min(1439, Math.max(0, total));
  const h = Math.floor(t / 60);
  const m = t % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

export function timeInputToMinutes(value: string): number {
  const [h, m] = value.split(":").map((x) => parseInt(x, 10));
  const hh = Number.isFinite(h) ? Math.min(23, Math.max(0, h)) : 0;
  const mm = Number.isFinite(m) ? Math.min(59, Math.max(0, m)) : 0;
  return hh * 60 + mm;
}

export type WorkWindowRow = {
  key: string;
  dayOfWeek: number;
  start: string;
  end: string;
};

export function workWindowsFromApi(list: WorkWindow[] | null | undefined): WorkWindowRow[] {
  if (!list?.length) return [];
  return list.map((w, i) => ({
    key: `ww-${w.dayOfWeek}-${w.startMinute}-${w.endMinute}-${i}`,
    dayOfWeek: w.dayOfWeek,
    start: minutesToTimeInput(w.startMinute),
    end: minutesToTimeInput(w.endMinute),
  }));
}

export function workWindowsToApi(rows: WorkWindowRow[]): WorkWindow[] {
  return rows.map((r) => ({
    dayOfWeek: r.dayOfWeek,
    startMinute: timeInputToMinutes(r.start),
    endMinute: timeInputToMinutes(r.end),
  }));
}
