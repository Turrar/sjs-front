import Link from "next/link";
import type { UserMe } from "@/lib/types";
import {
  isStudentProfileReadyForResume,
  validateResumeForSave,
  type ResumeContent,
} from "@/lib/resume-content";
import { cn } from "@/lib/cn";

type ResumeValidationHintProps = {
  content: ResumeContent;
  user: UserMe;
  title: string;
  className?: string;
};

export function ResumeValidationHint({
  content,
  user,
  title,
  className,
}: ResumeValidationHintProps) {
  const { valid, issues } = validateResumeForSave(content, user, title);
  const profileReady = isStudentProfileReadyForResume(user);

  if (valid) {
    return (
      <p className={cn("text-sm text-success", className)}>
        Обязательные поля заполнены — можно сохранить.
      </p>
    );
  }

  return (
    <div
      className={cn(
        "rounded-xl border border-border/80 bg-muted/30 px-4 py-3 text-sm",
        className,
      )}
    >
      <p className="font-medium text-foreground">Для сохранения нужно:</p>
      <ul className="mt-2 list-inside list-disc space-y-1 text-muted-foreground">
        {issues.map((issue) => (
          <li key={issue}>{issue}</li>
        ))}
      </ul>
      {!profileReady ? (
        <Link
          href="/profile"
          className="mt-2 inline-block font-medium text-accent hover:underline"
        >
          Заполнить профиль →
        </Link>
      ) : null}
    </div>
  );
}
