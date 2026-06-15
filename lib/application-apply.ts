import { ApiError } from "@/lib/api-base";
import type { Job } from "@/lib/types";

export type ApplicationSubmitInput = {
  resumeDraftId?: string;
  coverLetter?: string;
};

export type ApplicationValidationResult = {
  valid: boolean;
  issues: string[];
};

export function validateApplicationSubmit(
  job: Pick<Job, "requiresResume" | "requiresCoverLetter">,
  input: ApplicationSubmitInput,
): ApplicationValidationResult {
  const issues: string[] = [];

  if (job.requiresResume && !input.resumeDraftId?.trim()) {
    issues.push("Выберите резюме");
  }
  if (job.requiresCoverLetter && !input.coverLetter?.trim()) {
    issues.push("Заполните сопроводительное письмо");
  }

  return { valid: issues.length === 0, issues };
}

const APPLY_ERROR_RU: Record<string, string> = {
  "resume is required for this job": "Для этой вакансии нужно приложить резюме",
  "cover letter is required for this job":
    "Для этой вакансии нужно сопроводительное письмо",
  "resume draft not found": "Черновик резюме не найден",
  "job not found": "Вакансия не найдена или недоступна для отклика",
  "already applied": "Вы уже откликались на эту вакансию",
  "student profile required": "Нужен профиль студента. Заполните раздел «Профиль».",
};

function mapApplyMessage(message: string): string | null {
  const key = message.toLowerCase();
  for (const [pattern, label] of Object.entries(APPLY_ERROR_RU)) {
    if (key.includes(pattern)) return label;
  }
  return null;
}

export function applicationApplyErrorMessage(e: unknown, fallback: string): string {
  if (e instanceof ApiError) {
    const mapped = mapApplyMessage(e.message);
    if (mapped) return mapped;
    if (e.status === 403) {
      return "Нужен профиль студента. Заполните раздел «Профиль».";
    }
    if (e.status === 409) {
      return "Вы уже откликались на эту вакансию";
    }
    if (e.status === 404) {
      return e.message || "Ресурс не найден";
    }
    return e.message;
  }
  if (e instanceof Error) return e.message;
  return fallback;
}

export type JobRequirementBadge = {
  label: string;
  className: string;
};

export function jobRequirementBadges(
  job: Pick<Job, "requiresResume" | "requiresCoverLetter">,
): JobRequirementBadge[] {
  const badges: JobRequirementBadge[] = [];
  if (job.requiresResume) {
    badges.push({
      label: "Резюме обязательно",
      className: "bg-accent/10 text-accent",
    });
  }
  if (job.requiresCoverLetter) {
    badges.push({
      label: "Письмо обязательно",
      className: "bg-violet-500/10 text-violet-700",
    });
  }
  return badges;
}

export function jobApplyRequirementLabels(
  job: Pick<Job, "requiresResume" | "requiresCoverLetter">,
): string[] {
  const labels: string[] = [];
  if (job.requiresResume) labels.push("Нужно резюме");
  if (job.requiresCoverLetter) labels.push("Нужно сопроводительное");
  return labels;
}
