import type { ApplicationStatus } from "@/lib/types";

/** Статусы отклика, при которых доступно видеоинтервью (бэкенд). */
export const VIDEO_INTERVIEW_STATUSES = ["INTERVIEW", "OFFER", "HIRED"] as const;

export type VideoInterviewStatus = (typeof VIDEO_INTERVIEW_STATUSES)[number];

export const VIDEO_ROOM_POLL_MS = 10_000;

export function isVideoInterviewStatus(
  status: ApplicationStatus | string,
): status is VideoInterviewStatus {
  return (VIDEO_INTERVIEW_STATUSES as readonly string[]).includes(status);
}

export function openVideoRoomUrl(url: string) {
  window.open(url, "_blank", "noopener,noreferrer");
}
