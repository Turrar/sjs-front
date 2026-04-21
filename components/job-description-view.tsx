"use client";

import DOMPurify from "isomorphic-dompurify";
import { jobDescriptionLooksLikeHtml } from "@/lib/job-description-html";
import { cn } from "@/lib/cn";

type JobDescriptionViewProps = {
  description: string;
  className?: string;
};

/**
 * Описание вакансии: HTML (из TipTap) с санитизацией или обычный текст.
 */
export function JobDescriptionView({
  description,
  className,
}: JobDescriptionViewProps) {
  const trimmed = description.trim();
  if (!trimmed) return null;

  if (jobDescriptionLooksLikeHtml(trimmed)) {
    return (
      <div
        className={cn(
          "job-description-html max-w-none text-sm leading-relaxed text-card-foreground",
          "[&_p]:my-2 [&_p:first-child]:mt-0",
          "[&_ul]:my-2 [&_ul]:list-disc [&_ul]:pl-5",
          "[&_ol]:my-2 [&_ol]:list-decimal [&_ol]:pl-5",
          "[&_blockquote]:my-2 [&_blockquote]:border-l-2 [&_blockquote]:border-border [&_blockquote]:pl-3 [&_blockquote]:text-muted-foreground",
          "[&_h2]:mt-4 [&_h2]:text-lg [&_h2]:font-semibold",
          "[&_h3]:mt-3 [&_h3]:text-base [&_h3]:font-semibold",
          "[&_a]:text-accent [&_a]:underline",
          className,
        )}
        dangerouslySetInnerHTML={{
          __html: DOMPurify.sanitize(trimmed),
        }}
      />
    );
  }

  return (
    <div
      className={cn(
        "whitespace-pre-wrap text-sm leading-relaxed text-card-foreground",
        className,
      )}
    >
      {description}
    </div>
  );
}
