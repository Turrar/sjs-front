"use client";

import { Plus, Trash2 } from "lucide-react";
import type { ResumeLanguage } from "@/lib/resume-content";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";

type ResumeSectionLanguagesProps = {
  value: ResumeLanguage[];
  onChange: (value: ResumeLanguage[]) => void;
};

function emptyLanguage(): ResumeLanguage {
  return { name: "", level: "" };
}

export function ResumeSectionLanguages({
  value,
  onChange,
}: ResumeSectionLanguagesProps) {
  function updateItem(index: number, patch: Partial<ResumeLanguage>) {
    onChange(value.map((item, i) => (i === index ? { ...item, ...patch } : item)));
  }

  function removeItem(index: number) {
    onChange(value.filter((_, i) => i !== index));
  }

  return (
    <Card>
      <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
        <div>
          <CardTitle>Языки</CardTitle>
          <CardDescription>Иностранные языки и уровень владения.</CardDescription>
        </div>
        <Button
          type="button"
          variant="secondary"
          onClick={() => onChange([...value, emptyLanguage()])}
        >
          <Plus className="h-4 w-4" />
          Добавить
        </Button>
      </div>

      {value.length === 0 ? (
        <p className="rounded-xl border border-dashed border-border bg-muted/30 px-4 py-6 text-center text-sm text-muted-foreground">
          Пока нет записей.
        </p>
      ) : (
        <div className="space-y-3">
          {value.map((item, index) => (
            <div key={index} className="flex flex-wrap items-end gap-3">
              <div className="min-w-[140px] flex-1">
                <Input
                  label="Язык"
                  value={item.name}
                  onChange={(e) => updateItem(index, { name: e.target.value })}
                />
              </div>
              <div className="min-w-[120px] flex-1">
                <Input
                  label="Уровень"
                  value={item.level}
                  onChange={(e) => updateItem(index, { level: e.target.value })}
                  placeholder="B2, C1…"
                />
              </div>
              <Button
                type="button"
                variant="ghost"
                className="mb-0.5 text-danger"
                onClick={() => removeItem(index)}
                aria-label={`Удалить язык ${index + 1}`}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}
