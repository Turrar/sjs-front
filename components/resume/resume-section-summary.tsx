"use client";

import { SUMMARY_MIN } from "@/lib/resume-content";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";

type ResumeSectionSummaryProps = {
  value: string;
  onChange: (value: string) => void;
};

export function ResumeSectionSummary({ value, onChange }: ResumeSectionSummaryProps) {
  return (
    <Card>
      <CardTitle>О себе</CardTitle>
      <CardDescription className="mb-5">
        Краткое описание: курс, специализация, цели. Минимум {SUMMARY_MIN} символов
        для сохранения.
      </CardDescription>
      <Textarea
        label="Краткое описание"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Студент 3 курса, Frontend-разработчик…"
      />
    </Card>
  );
}
