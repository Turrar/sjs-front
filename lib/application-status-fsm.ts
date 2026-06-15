import type { ApplicationStatus } from "@/lib/types";
import {
  applicationStatusOrder,
  canStudentWithdraw,
  isTerminalApplicationStatus,
} from "@/lib/application-display";

/** Linear pipeline transitions allowed for employer (mirrors backend FSM). */
const EMPLOYER_TRANSITIONS: Partial<Record<ApplicationStatus, ApplicationStatus[]>> = {
  SUBMITTED: ["REVIEWING", "REJECTED"],
  REVIEWING: ["SHORTLISTED", "REJECTED"],
  SHORTLISTED: ["INTERVIEW", "REJECTED"],
  INTERVIEW: ["OFFER", "HIRED", "REJECTED"],
  OFFER: ["HIRED", "REJECTED"],
  HIRED: [],
  REJECTED: [],
  WITHDRAWN: [],
};

export function getAllowedEmployerTransitions(
  current: ApplicationStatus,
): ApplicationStatus[] {
  return EMPLOYER_TRANSITIONS[current] ?? [];
}

export function canTransition(
  from: ApplicationStatus,
  to: ApplicationStatus,
  role: "EMPLOYER" | "STUDENT",
): boolean {
  if (from === to) return true;
  if (role === "STUDENT") {
    return canStudentWithdraw(from) && to === "WITHDRAWN";
  }
  return getAllowedEmployerTransitions(from).includes(to);
}

/** Options for employer status select: current + allowed next steps. */
export function getEmployerStatusSelectOptions(
  current: ApplicationStatus,
): ApplicationStatus[] {
  const next = getAllowedEmployerTransitions(current);
  return [current, ...next.filter((s) => s !== current)];
}

/** Whether employer can click a pipeline step button to transition. */
export function isEmployerPipelineStepClickable(
  current: ApplicationStatus,
  target: ApplicationStatus,
  stepIndex: number,
  currentIndex: number,
): boolean {
  if (isTerminalApplicationStatus(current)) return false;
  if (target === "REJECTED") {
    return current !== "REJECTED" && getAllowedEmployerTransitions(current).includes("REJECTED");
  }
  if (stepIndex === currentIndex) return false;
  if (stepIndex < currentIndex) return false;
  const allowed = getAllowedEmployerTransitions(current);
  return allowed.includes(target) && stepIndex === currentIndex + 1;
}

export function transitionErrorMessage(status?: number): string {
  if (status === 400) return "Недопустимый переход статуса.";
  return "Не удалось обновить статус.";
}
