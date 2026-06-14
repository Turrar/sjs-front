import type { EmployerVerificationStatus } from "@/lib/types";

export type VerificationBadge = { label: string; className: string; borderClass?: string };

const verificationMap: Record<EmployerVerificationStatus, VerificationBadge> = {
  PENDING: {
    label: "На проверке",
    className: "bg-amber-500/10 text-amber-700",
    borderClass: "border-amber-300/40",
  },
  VERIFIED: {
    label: "Верифицирован",
    className: "bg-success/10 text-success",
    borderClass: "border-success/30",
  },
  REJECTED: {
    label: "Отклонён",
    className: "bg-danger/10 text-danger",
    borderClass: "border-danger/30",
  },
};

export function verificationStatusBadge(status: EmployerVerificationStatus): VerificationBadge {
  return verificationMap[status] ?? verificationMap.PENDING;
}
