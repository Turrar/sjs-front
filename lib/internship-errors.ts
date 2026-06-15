import { ApiError } from "@/lib/api-base";

export const LOG_HOURS_MIN = 0.25;
export const LOG_HOURS_MAX = 24;
export const LOG_DESC_MAX = 1000;

export function internshipErrorMessage(e: unknown, fallback: string): string {
  if (e instanceof ApiError) {
    if (e.status === 403) {
      return "Нет доступа к этой стажировке.";
    }
    if (e.status === 404) {
      return "Стажировка не найдена.";
    }
    if (e.status === 400) {
      const msg = e.message.toLowerCase();
      if (msg.includes("not active") || msg.includes("не актив")) {
        return "Журнал доступен только для активной стажировки.";
      }
      return e.message || "Проверьте дату, часы и описание.";
    }
    return e.message;
  }
  if (e instanceof Error) return e.message;
  return fallback;
}

export function formatInternshipDate(iso: string | null | undefined): string | null {
  if (!iso) return null;
  return new Date(iso).toLocaleDateString("ru-RU", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function validateLogHours(hours: number): string | null {
  if (Number.isNaN(hours)) return "Укажите количество часов.";
  if (hours < LOG_HOURS_MIN || hours > LOG_HOURS_MAX) {
    return `Часы от ${LOG_HOURS_MIN} до ${LOG_HOURS_MAX}.`;
  }
  const stepOk = Math.abs(hours * 4 - Math.round(hours * 4)) < 0.001;
  if (!stepOk) return "Шаг часов — 0.25 (15 минут).";
  return null;
}
