import type { InternshipStatus, InternshipTaskStatus } from "@/lib/types";

export type StatusDisplay = { label: string; className: string };

export const internshipStatusDisplay: Record<InternshipStatus, StatusDisplay> = {
  ACTIVE:    { label: "Активна",    className: "bg-success/10 text-success" },
  COMPLETED: { label: "Завершена",  className: "bg-blue-500/10 text-blue-700" },
  CANCELLED: { label: "Отменена",  className: "bg-muted/70 text-muted-foreground" },
};

export const internshipTaskStatusDisplay: Record<InternshipTaskStatus, StatusDisplay> = {
  TODO:        { label: "К выполнению", className: "bg-muted/70 text-muted-foreground" },
  IN_PROGRESS: { label: "В работе",     className: "bg-sky-500/10 text-sky-700" },
  DONE:        { label: "Выполнено",    className: "bg-success/10 text-success" },
};

export const internshipTaskStatuses: InternshipTaskStatus[] = ["TODO", "IN_PROGRESS", "DONE"];

export function getInternshipStatus(status: InternshipStatus): StatusDisplay {
  return internshipStatusDisplay[status];
}

export function getInternshipTaskStatus(status: InternshipTaskStatus): StatusDisplay {
  return internshipTaskStatusDisplay[status];
}
