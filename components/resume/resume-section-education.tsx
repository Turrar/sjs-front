"use client";

import { Plus, Trash2 } from "lucide-react";
import type { ResumeEducation } from "@/lib/resume-content";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";

type ResumeSectionEducationProps = {
  value: ResumeEducation[];
  onChange: (value: ResumeEducation[]) => void;
};

function emptyEducation(): ResumeEducation {
  return { school: "", degree: "", year: "" };
}

export function ResumeSectionEducation({
  value,
  onChange,
}: ResumeSectionEducationProps) {
  function updateItem(index: number, patch: Partial<ResumeEducation>) {
    onChange(value.map((item, i) => (i === index ? { ...item, ...patch } : item)));
  }

  function removeItem(index: number) {
    onChange(value.filter((_, i) => i !== index));
  }

  return (
    <Card>
      <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
        <div>
          <CardTitle>Образование</CardTitle>
          <CardDescription>Вуз, степень и год окончания.</CardDescription>
        </div>
        <Button
          type="button"
          variant="secondary"
          onClick={() => onChange([...value, emptyEducation()])}
        >
          <Plus className="h-4 w-4" />
          Добавить
        </Button>
      </div>

      {value.length === 0 ? (
        <p className="rounded-xl border border-dashed border-border bg-muted/30 px-4 py-6 text-center text-sm text-muted-foreground">
          Пока нет записей. Нажмите «Добавить».
        </p>
      ) : (
        <div className="space-y-4">
          {value.map((item, index) => (
            <div
              key={index}
              className="rounded-xl border border-border/80 bg-muted/20 p-4"
            >
              <div className="mb-3 flex items-center justify-between gap-2">
                <p className="text-sm font-medium text-foreground">
                  Запись {index + 1}
                </p>
                <Button
                  type="button"
                  variant="ghost"
                  className="text-danger"
                  onClick={() => removeItem(index)}
                  aria-label={`Удалить образование ${index + 1}`}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <Input
                  label="Вуз"
                  value={item.school}
                  onChange={(e) => updateItem(index, { school: e.target.value })}
                />
                <Input
                  label="Степень / специальность"
                  value={item.degree}
                  onChange={(e) => updateItem(index, { degree: e.target.value })}
                />
                <Input
                  label="Год"
                  value={item.year}
                  onChange={(e) => updateItem(index, { year: e.target.value })}
                  placeholder="2027"
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}
