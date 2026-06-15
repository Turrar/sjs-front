"use client";

import { Plus, Trash2 } from "lucide-react";
import type { ResumeExperience } from "@/lib/resume-content";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";

type ResumeSectionExperienceProps = {
  value: ResumeExperience[];
  onChange: (value: ResumeExperience[]) => void;
};

function emptyExperience(): ResumeExperience {
  return { company: "", role: "", bullets: [""] };
}

export function ResumeSectionExperience({
  value,
  onChange,
}: ResumeSectionExperienceProps) {
  function updateItem(index: number, patch: Partial<ResumeExperience>) {
    onChange(value.map((item, i) => (i === index ? { ...item, ...patch } : item)));
  }

  function removeItem(index: number) {
    onChange(value.filter((_, i) => i !== index));
  }

  function updateBullet(expIndex: number, bulletIndex: number, text: string) {
    const item = value[expIndex];
    if (!item) return;
    const bullets = [...item.bullets];
    bullets[bulletIndex] = text;
    updateItem(expIndex, { bullets });
  }

  function addBullet(expIndex: number) {
    const item = value[expIndex];
    if (!item) return;
    updateItem(expIndex, { bullets: [...item.bullets, ""] });
  }

  function removeBullet(expIndex: number, bulletIndex: number) {
    const item = value[expIndex];
    if (!item) return;
    updateItem(expIndex, {
      bullets: item.bullets.filter((_, i) => i !== bulletIndex),
    });
  }

  return (
    <Card>
      <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
        <div>
          <CardTitle>Опыт</CardTitle>
          <CardDescription>Стажировки, проекты и работа.</CardDescription>
        </div>
        <Button
          type="button"
          variant="secondary"
          onClick={() => onChange([...value, emptyExperience()])}
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
                  Место {index + 1}
                </p>
                <Button
                  type="button"
                  variant="ghost"
                  className="text-danger"
                  onClick={() => removeItem(index)}
                  aria-label={`Удалить опыт ${index + 1}`}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <Input
                  label="Компания / проект"
                  value={item.company}
                  onChange={(e) => updateItem(index, { company: e.target.value })}
                />
                <Input
                  label="Роль"
                  value={item.role}
                  onChange={(e) => updateItem(index, { role: e.target.value })}
                />
              </div>
              <div className="mt-4 space-y-2">
                <p className="text-sm font-medium text-foreground">Достижения</p>
                {item.bullets.map((bullet, bulletIndex) => (
                  <div key={bulletIndex} className="flex gap-2">
                    <Textarea
                      value={bullet}
                      onChange={(e) =>
                        updateBullet(index, bulletIndex, e.target.value)
                      }
                      placeholder="Что сделали и какой результат"
                      className="min-h-[72px] flex-1"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      className="shrink-0 self-start text-danger"
                      onClick={() => removeBullet(index, bulletIndex)}
                      disabled={item.bullets.length <= 1}
                      aria-label="Удалить пункт"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
                <Button
                  type="button"
                  variant="ghost"
                  className="text-xs"
                  onClick={() => addBullet(index)}
                >
                  <Plus className="h-3.5 w-3.5" />
                  Добавить пункт
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}
