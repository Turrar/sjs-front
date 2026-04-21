import type { Notification, UserRole } from "@/lib/types";

function isRecord(x: unknown): x is Record<string, unknown> {
  return typeof x === "object" && x !== null;
}

function str(p: Record<string, unknown>, key: string): string | undefined {
  const v = p[key];
  return typeof v === "string" ? v : undefined;
}

const STATUS_RU: Record<string, string> = {
  SUBMITTED: "Отправлен",
  REVIEWING: "На рассмотрении",
  SHORTLISTED: "В шорт-листе",
  INTERVIEW: "Собеседование",
  OFFER: "Предложение",
  REJECTED: "Отклонён",
  WITHDRAWN: "Отозван",
};

function statusLabel(status: string): string {
  return STATUS_RU[status] ?? status;
}

const KIND_TITLE: Record<string, string> = {
  APPLICATION_UPDATE: "Отклик",
  CHAT_MESSAGE: "Сообщение в чате",
  SCHEDULE_READY: "Расписание",
  SYSTEM: "Системное",
};

export type NotificationPresentation = {
  /** Короткий заголовок карточки */
  title: string;
  /** Основной текст для пользователя */
  body: string;
  /** Кнопка-ссылка */
  action?: { href: string; label: string };
};

/**
 * Человекочитаемое представление уведомления и ссылка в кабинет.
 */
export function getNotificationPresentation(
  n: Notification,
  role: UserRole | undefined,
): NotificationPresentation {
  const payload = n.payload;
  const kindTitle = KIND_TITLE[n.kind] ?? "Уведомление";

  if (!payload || !isRecord(payload)) {
    return {
      title: kindTitle,
      body:
        n.kind === "SCHEDULE_READY" || n.kind === "SYSTEM"
          ? "Служебное уведомление."
          : "Нет дополнительных данных.",
    };
  }

  if (n.kind === "APPLICATION_UPDATE") {
    const applicationId = str(payload, "applicationId");
    const jobId = str(payload, "jobId");
    const message = str(payload, "message");
    const status = str(payload, "status");

    if (message && jobId && applicationId && role === "EMPLOYER") {
      const isNewApplication =
        message === "New application received" ||
        message.toLowerCase().includes("application received");
      return {
        title: isNewApplication ? "Новый отклик" : "Событие по отклику",
        body: isNewApplication
          ? "Студент откликнулся на вашу вакансию."
          : message,
        action: {
          href: `/employer/jobs/${jobId}/applications`,
          label: "К откликам",
        },
      };
    }

    if (message && applicationId) {
      return {
        title: "Отклик",
        body: message,
        action: {
          href: `/applications/${applicationId}/chat`,
          label: "Открыть чат",
        },
      };
    }

    if (status && applicationId && jobId) {
      const st = statusLabel(status);
      if (role === "STUDENT") {
        return {
          title: "Статус отклика",
          body: `Работодатель обновил статус: ${st}.`,
          action: {
            href: `/applications/${applicationId}/chat`,
            label: "Открыть чат",
          },
        };
      }
      return {
        title: "Обновление по отклику",
        body: `Статус: ${st}.`,
        action: {
          href: `/employer/jobs/${jobId}/applications`,
          label: "К откликам",
        },
      };
    }

    return {
      title: kindTitle,
      body: "Изменения по отклику.",
      action:
        applicationId != null
          ? {
              href: `/applications/${applicationId}/chat`,
              label: "Чат по отклику",
            }
          : undefined,
    };
  }

  if (n.kind === "CHAT_MESSAGE") {
    const applicationId = str(payload, "applicationId");
    const preview = str(payload, "preview") ?? "";
    return {
      title: "Новое сообщение",
      body: preview ? preview : "Вам пришло сообщение в чате по отклику.",
      action: applicationId
        ? {
            href: `/applications/${applicationId}/chat`,
            label: "Открыть чат",
          }
        : undefined,
    };
  }

  if (n.kind === "SCHEDULE_READY") {
    return {
      title: kindTitle,
      body: "Расписание обработано или готово к просмотру.",
      action:
        role === "STUDENT"
          ? { href: "/schedule", label: "Расписание" }
          : undefined,
    };
  }

  if (n.kind === "SYSTEM") {
    return {
      title: kindTitle,
      body: "Системное сообщение.",
    };
  }

  return {
    title: kindTitle,
    body: "Получено уведомление.",
  };
}
