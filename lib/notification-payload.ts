import type {
  Notification,
  NotificationPayloadJobAlert,
  NotificationPayloadJobAlertJob,
} from "@/lib/types";

export const NOTIFICATION_POLL_MS = 30_000;

export const TELEGRAM_LINK_POLL_MS = 4_000;

export const TELEGRAM_LINKED_MASK = "***linked***";

function isRecord(x: unknown): x is Record<string, unknown> {
  return typeof x === "object" && x !== null;
}

export function getPayloadRecord(
  notification: Notification,
): Record<string, unknown> | null {
  const payload = notification.payload;
  return isRecord(payload) ? payload : null;
}

export function isVideoRoomNotification(
  notification: Notification,
  applicationId?: string,
): boolean {
  const rec = getPayloadRecord(notification);
  if (!rec || rec.videoRoom !== true) return false;
  if (applicationId != null) {
    return (
      typeof rec.applicationId === "string" &&
      rec.applicationId === applicationId
    );
  }
  return typeof rec.applicationId === "string";
}

export function isWithdrawNotification(notification: Notification): boolean {
  if (notification.kind !== "APPLICATION_UPDATE") return false;
  const rec = getPayloadRecord(notification);
  return rec?.status === "WITHDRAWN";
}

export function parseJobAlertPayload(
  payload: Record<string, unknown> | null,
): NotificationPayloadJobAlert | null {
  if (!payload) return null;
  const count =
    typeof payload.count === "number"
      ? payload.count
      : typeof payload.count === "string"
        ? parseInt(payload.count, 10)
        : NaN;
  if (!Number.isFinite(count)) return null;

  const rawJobs = payload.jobs;
  if (!Array.isArray(rawJobs)) return { count, jobs: [] };

  const jobs: NotificationPayloadJobAlertJob[] = rawJobs
    .filter(isRecord)
    .map((j) => ({
      id: typeof j.id === "string" ? j.id : "",
      title: typeof j.title === "string" ? j.title : "",
    }))
    .filter((j) => j.id && j.title);

  return { count, jobs };
}
