import type { ApplicationStatus } from "@/lib/types";

export type StatusStyle = {
  label: string;
  className: string;
};

export const applicationStatusStyles: Record<ApplicationStatus, StatusStyle> = {
  SUBMITTED:   { label: "Отправлен",        className: "bg-muted/70 text-muted-foreground" },
  REVIEWING:   { label: "На рассмотрении",  className: "bg-sky-500/10 text-sky-700" },
  SHORTLISTED: { label: "В списке",         className: "bg-sky-500/15 text-sky-700" },
  INTERVIEW:   { label: "Интервью",         className: "bg-violet-500/10 text-violet-700" },
  OFFER:       { label: "Оффер",            className: "bg-success/10 text-success" },
  REJECTED:    { label: "Отклонён",         className: "bg-danger/10 text-danger" },
  WITHDRAWN:   { label: "Отозван",          className: "bg-muted/70 text-muted-foreground" },
};

/** Alias for notification-display and external use */
export const applicationStatusLabels: Record<ApplicationStatus, string> = Object.fromEntries(
  Object.entries(applicationStatusStyles).map(([k, v]) => [k, v.label]),
) as Record<ApplicationStatus, string>;

/** Pipeline steps (no terminal statuses) */
export const applicationStatusOrder: ApplicationStatus[] = [
  "SUBMITTED",
  "REVIEWING",
  "SHORTLISTED",
  "INTERVIEW",
  "OFFER",
];

export const allApplicationStatuses: ApplicationStatus[] = [
  ...applicationStatusOrder,
  "REJECTED",
  "WITHDRAWN",
];

/** Statuses employer can set (not WITHDRAWN — student-only) */
export const employerSelectableStatuses: ApplicationStatus[] = [
  ...applicationStatusOrder,
  "REJECTED",
];

const TERMINAL_STATUSES: ApplicationStatus[] = ["REJECTED", "WITHDRAWN"];

/** Статусы, из которых студент может отозвать отклик (PATCH /applications/:id/withdraw) */
export const studentWithdrawableStatuses: ApplicationStatus[] = [
  "SUBMITTED",
  "REVIEWING",
  "SHORTLISTED",
  "INTERVIEW",
];

export function canStudentWithdraw(status: ApplicationStatus): boolean {
  return studentWithdrawableStatuses.includes(status);
}

export function isTerminalApplicationStatus(status: ApplicationStatus): boolean {
  return TERMINAL_STATUSES.includes(status);
}

export function getStatusStyle(status: string): StatusStyle {
  return (
    applicationStatusStyles[status as ApplicationStatus] ?? {
      label: status,
      className: "bg-muted/70 text-muted-foreground",
    }
  );
}

export type ScoreTier = { className: string; label: string };

export function employerScoreTier(score: number): ScoreTier {
  if (score >= 70) return { className: "bg-success/10 text-success", label: "high" };
  if (score >= 40) return { className: "bg-accent/10 text-accent", label: "mid" };
  return { className: "bg-danger/10 text-danger", label: "low" };
}

/** For list/detail badge: "AI 85" */
export function employerScoreBadgeClass(score: number): string {
  return `rounded-full px-2 py-0.5 text-xs font-semibold tabular-nums ${employerScoreTier(score).className}`;
}

/** Ring/card score colors (dashboard, detail) */
export function employerScoreRingClass(score: number): string {
  if (score >= 70) return "bg-success/15 text-success";
  if (score >= 40) return "bg-accent/15 text-accent";
  return "bg-danger/15 text-danger";
}

/** Skill test / badge percent colors */
export function scorePercentClass(score: number): string {
  if (score >= 80) return "bg-success/15 text-success";
  if (score >= 60) return "bg-accent/15 text-accent";
  return "bg-danger/10 text-danger";
}
