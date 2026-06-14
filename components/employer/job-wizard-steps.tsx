"use client";

import { cn } from "@/lib/cn";

const STEPS = [
  { id: 0, label: "Основное" },
  { id: 1, label: "Условия" },
  { id: 2, label: "Проверка" },
] as const;

export function JobWizardSteps({
  step,
  className,
}: {
  step: number;
  className?: string;
}) {
  return (
    <ol
      className={cn("mb-8 flex flex-wrap gap-2", className)}
      aria-label="Шаги создания вакансии"
    >
      {STEPS.map((s, i) => {
        const done = i < step;
        const active = i === step;
        return (
          <li
            key={s.id}
            className={cn(
              "flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition-colors",
              active && "bg-accent text-accent-foreground shadow-sm",
              done && !active && "bg-success/10 text-success",
              !active && !done && "bg-muted text-muted-foreground",
            )}
          >
            <span
              className={cn(
                "flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold",
                active && "bg-accent-foreground/20",
                done && !active && "bg-success/20",
                !active && !done && "bg-background",
              )}
            >
              {done && !active ? "✓" : i + 1}
            </span>
            {s.label}
          </li>
        );
      })}
    </ol>
  );
}

export const JOB_WIZARD_STEP_COUNT = STEPS.length;
