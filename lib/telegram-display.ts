import { ApiError } from "@/lib/api-base";
import type { EmployerProfile, StudentProfile } from "@/lib/types";
import {
  TELEGRAM_LINKED_MASK,
  TELEGRAM_LINK_POLL_MS,
} from "@/lib/notification-payload";

export { TELEGRAM_LINKED_MASK, TELEGRAM_LINK_POLL_MS };

/** Показать подсказку, если polling идёт дольше 2 минут без успеха */
export const TELEGRAM_POLLING_HINT_MS = 120_000;

export type TelegramLinkableProfile =
  | StudentProfile
  | EmployerProfile
  | null
  | undefined;

export function isTelegramLinked(profile: TelegramLinkableProfile): boolean {
  return profile?.telegramChatId === TELEGRAM_LINKED_MASK;
}

export function telegramLinkErrorMessage(e: unknown, fallback: string): string {
  if (e instanceof ApiError) {
    if (e.status === 401) {
      return "Сессия истекла. Войдите снова.";
    }
    if (e.status === 403) {
      return "Нет доступа к привязке Telegram.";
    }
    return e.message;
  }
  if (e instanceof Error) return e.message;
  return fallback;
}
