"use client";

import type { ResumeContent } from "@/lib/resume-content";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";

type ResumePreviewProps = {
  title: string;
  content: ResumeContent;
};

export function ResumePreview({ title, content }: ResumePreviewProps) {
  const displayTitle = title.trim() || "Без названия";

  return (
    <Card>
      <CardTitle>Превью</CardTitle>
      <CardDescription className="mb-4">
        Как будет выглядеть резюме при просмотре.
      </CardDescription>

      <div className="space-y-4 rounded-xl border border-border/80 bg-card p-4 text-sm">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            {displayTitle}
          </p>
          {content.personal.fullName ? (
            <p className="mt-1 text-lg font-semibold text-foreground">
              {content.personal.fullName}
            </p>
          ) : null}
          <p className="mt-1 text-xs text-muted-foreground">
            {[content.personal.email, content.personal.phone]
              .filter(Boolean)
              .join(" · ")}
          </p>
        </div>

        {content.summary ? (
          <section>
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              О себе
            </p>
            <p className="mt-1 whitespace-pre-wrap leading-relaxed text-foreground">
              {content.summary}
            </p>
          </section>
        ) : null}

        {content.education.length > 0 ? (
          <section>
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Образование
            </p>
            <ul className="mt-2 space-y-2">
              {content.education.map((e, i) => (
                <li key={i}>
                  <p className="font-medium text-foreground">
                    {[e.school, e.degree].filter(Boolean).join(" — ") || "—"}
                  </p>
                  {e.year ? (
                    <p className="text-xs text-muted-foreground">{e.year}</p>
                  ) : null}
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        {content.experience.length > 0 ? (
          <section>
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Опыт
            </p>
            <ul className="mt-2 space-y-3">
              {content.experience.map((exp, i) => (
                <li key={i}>
                  <p className="font-medium text-foreground">
                    {[exp.company, exp.role].filter(Boolean).join(" · ") || "—"}
                  </p>
                  {exp.bullets.filter(Boolean).length > 0 ? (
                    <ul className="mt-1 list-disc space-y-0.5 pl-4 text-muted-foreground">
                      {exp.bullets.filter(Boolean).map((b, j) => (
                        <li key={j}>{b}</li>
                      ))}
                    </ul>
                  ) : null}
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        {content.skills.length > 0 ? (
          <section>
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Навыки
            </p>
            <p className="mt-1 text-foreground">{content.skills.join(", ")}</p>
          </section>
        ) : null}

        {content.languages.length > 0 ? (
          <section>
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Языки
            </p>
            <ul className="mt-1 space-y-0.5 text-foreground">
              {content.languages.map((l, i) => (
                <li key={i}>
                  {[l.name, l.level].filter(Boolean).join(" — ")}
                </li>
              ))}
            </ul>
          </section>
        ) : null}
      </div>
    </Card>
  );
}
