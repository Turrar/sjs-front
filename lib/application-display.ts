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

export const applicationStatusOrder: ApplicationStatus[] = [
  "SUBMITTED",
  "REVIEWING",
  "SHORTLISTED",
  "INTERVIEW",
  "OFFER",
];

export function getStatusStyle(status: string): StatusStyle {
  return (
    applicationStatusStyles[status as ApplicationStatus] ?? {
      label: status,
      className: "bg-muted/70 text-muted-foreground",
    }
  );
}
