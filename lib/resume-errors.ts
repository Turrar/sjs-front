import { ApiError } from "@/lib/api-base";

export function resumeErrorMessage(e: unknown, fallback: string): string {
  if (e instanceof ApiError) {
    if (e.status === 403) {
      return "Нужен профиль студента. Заполните профиль в разделе «Профиль».";
    }
    if (e.status === 404) {
      return "Черновик не найден или недоступен.";
    }
    if (e.status === 400) {
      const msg = e.message.toLowerCase();
      if (msg.includes("contentjson") || msg.includes("content")) {
        return "Некорректное содержимое резюме (contentJson должен быть объектом).";
      }
      if (msg.includes("pdfstoragekey") || msg.includes("storage")) {
        return "PDF не принадлежит вашему аккаунту. Загрузите файл заново.";
      }
      return e.message;
    }
    if (e.status === 503) {
      return "AI временно недоступен.";
    }
    return e.message;
  }
  if (e instanceof Error) return e.message;
  return fallback;
}
