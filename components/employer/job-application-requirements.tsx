"use client";

import { CardDescription } from "@/components/ui/card";

type JobApplicationRequirementsProps = {
  requiresResume: boolean;
  requiresCoverLetter: boolean;
  onRequiresResumeChange: (value: boolean) => void;
  onRequiresCoverLetterChange: (value: boolean) => void;
  disabled?: boolean;
};

export function JobApplicationRequirements({
  requiresResume,
  requiresCoverLetter,
  onRequiresResumeChange,
  onRequiresCoverLetterChange,
  disabled = false,
}: JobApplicationRequirementsProps) {
  return (
    <fieldset
      className="space-y-3 rounded-2xl border border-border/80 bg-muted/20 p-4 sm:p-5"
      disabled={disabled}
    >
      <div>
        <p className="text-base font-semibold text-foreground">Требования к отклику</p>
        <CardDescription className="mt-1">
          Студент не сможет отправить отклик без указанных материалов.
        </CardDescription>
      </div>
      <label className="flex cursor-pointer items-start gap-3 text-sm text-foreground">
        <input
          type="checkbox"
          className="mt-0.5 h-4 w-4 rounded border-border text-accent focus:ring-accent"
          checked={requiresResume}
          onChange={(e) => onRequiresResumeChange(e.target.checked)}
        />
        <span>
          <span className="font-medium">Резюме обязательно</span>
          <span className="mt-0.5 block text-muted-foreground">
            Студент выбирает черновик из конструктора резюме.
          </span>
        </span>
      </label>
      <label className="flex cursor-pointer items-start gap-3 text-sm text-foreground">
        <input
          type="checkbox"
          className="mt-0.5 h-4 w-4 rounded border-border text-accent focus:ring-accent"
          checked={requiresCoverLetter}
          onChange={(e) => onRequiresCoverLetterChange(e.target.checked)}
        />
        <span>
          <span className="font-medium">Сопроводительное письмо обязательно</span>
          <span className="mt-0.5 block text-muted-foreground">
            Поле письма должно быть заполнено при отклике.
          </span>
        </span>
      </label>
    </fieldset>
  );
}
