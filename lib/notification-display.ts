import type { Notification, UserRole } from "@/lib/types";
import {
  getPayloadRecord,
  isWithdrawNotification,
  isVideoRoomNotification,
  parseJobAlertPayload,
} from "@/lib/notification-payload";

function str(p: Record<string, unknown>, key: string): string | undefined {
  const v = p[key];
  return typeof v === "string" ? v : undefined;
}

const STATUS_RU: Record<string, string> = {
  SUBMITTED: "Отправлен",
  REVIEWING: "На рассмотрении",
  SHORTLISTED: "В списке кандидатов",
  INTERVIEW: "Собеседование",
  OFFER: "Оффер",
  HIRED: "Принят",
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
  JOB_ALERT: "Подписка на вакансии",
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
  const payload = getPayloadRecord(n);
  const kindTitle = KIND_TITLE[n.kind] ?? "Уведомление";

  if (!payload) {
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
    const jobTitle = str(payload, "jobTitle");

    if (isVideoRoomNotification(n) && applicationId && role === "STUDENT") {
      return {
        title: "Видеоинтервью",
        body: "Работодатель открыл видеосозвон — можно присоединиться.",
        action: {
          href: `/applications/${applicationId}`,
          label: "К отклику",
        },
      };
    }

    if (isWithdrawNotification(n) && role === "EMPLOYER") {
      const vacancy = jobTitle ? ` «${jobTitle}»` : "";
      return {
        title: "Отзыв отклика",
        body: `Студент отозвал отклик${vacancy}.`,
        action: applicationId
          ? {
              href: `/employer/applications/${applicationId}`,
              label: "К отклику",
            }
          : jobId
            ? {
                href: `/employer/jobs/${jobId}/applications`,
                label: "К откликам",
              }
            : undefined,
      };
    }

    if (message && jobId && applicationId && role === "EMPLOYER") {
      const isNewApplication =
        message === "New application received" ||
        message.toLowerCase().includes("application received");
      const vacancy = jobTitle ? ` «${jobTitle}»` : "";
      return {
        title: isNewApplication ? "Новый отклик" : "Событие по отклику",
        body: isNewApplication
          ? `Студент откликнулся на вашу вакансию${vacancy}.`
          : message,
        action: {
          href: `/employer/jobs/${jobId}/applications`,
          label: "К откликам",
        },
      };
    }

    if (status && applicationId && jobId) {
      const st = statusLabel(status);
      const vacancy = jobTitle ? ` по «${jobTitle}»` : "";
      if (role === "STUDENT") {
        return {
          title: "Статус отклика",
          body: `Работодатель обновил статус${vacancy}: ${st}.`,
          action: {
            href: `/applications/${applicationId}`,
            label: "К отклику",
          },
        };
      }
      return {
        title: "Обновление по отклику",
        body: `Статус${vacancy}: ${st}.`,
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

  if (n.kind === "JOB_ALERT") {
    const parsed = parseJobAlertPayload(payload);
    const count = parsed?.count ?? 0;
    const titles = (parsed?.jobs ?? [])
      .slice(0, 3)
      .map((j) => j.title)
      .join(", ");
    const suffix =
      parsed && parsed.jobs.length > 3
        ? ` и ещё ${parsed.jobs.length - 3}`
        : "";
    return {
      title: "Новые вакансии по подписке",
      body:
        count > 0
          ? `Найдено ${count} новых вакансий${titles ? `: ${titles}${suffix}` : ""}.`
          : "Появились новые вакансии по вашей подписке.",
      action:
        role === "STUDENT"
          ? { href: "/dashboard/jobs", label: "Смотреть вакансии" }
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
