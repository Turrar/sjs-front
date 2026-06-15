import type { ApplicationResume } from "@/lib/types";
import { cn } from "@/lib/cn";

type ApplicationResumeCardProps = {
  resume: ApplicationResume;
  compact?: boolean;
  className?: string;
};

export function ApplicationResumeCard({
  resume,
  compact = false,
  className,
}: ApplicationResumeCardProps) {
  const title = resume.title?.trim() || "Резюме без названия";

  if (compact) {
    return (
      <div className={cn("text-sm", className)}>
        <span className="text-muted-foreground">Резюме: </span>
        <span className="font-medium text-foreground">{title}</span>
        {resume.pdfUrl ? (
          <>
            {" · "}
            <a
              href={resume.pdfUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium text-accent hover:underline"
            >
              PDF
            </a>
          </>
        ) : (
          <span className="text-muted-foreground"> · PDF не загружен</span>
        )}
      </div>
    );
  }

  return (
    <div
      className={cn(
        "rounded-xl border border-border/80 bg-muted/20 px-4 py-3",
        className,
      )}
    >
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        Прикреплённое резюме
      </p>
      <p className="mt-1 font-medium text-foreground">{title}</p>
      {resume.pdfUrl ? (
        <a
          href={resume.pdfUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-2 inline-flex text-sm font-medium text-accent hover:underline"
        >
          Скачать PDF →
        </a>
      ) : (
        <p className="mt-2 text-sm text-muted-foreground">PDF не загружен</p>
      )}
    </div>
  );
}
