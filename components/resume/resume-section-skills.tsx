"use client";

import { useState } from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";

type ResumeSectionSkillsProps = {
  value: string[];
  onChange: (value: string[]) => void;
};

export function ResumeSectionSkills({ value, onChange }: ResumeSectionSkillsProps) {
  const [draft, setDraft] = useState("");

  function addSkill(raw: string) {
    const skill = raw.trim();
    if (!skill) return;
    if (value.some((s) => s.toLowerCase() === skill.toLowerCase())) return;
    onChange([...value, skill]);
    setDraft("");
  }

  return (
    <Card>
      <CardTitle>Навыки</CardTitle>
      <CardDescription className="mb-5">
        Технологии и инструменты. Введите и нажмите Enter.
      </CardDescription>

      {value.length > 0 ? (
        <div className="mb-4 flex flex-wrap gap-2">
          {value.map((skill) => (
            <span
              key={skill}
              className="inline-flex items-center gap-1 rounded-full border border-accent/40 bg-accent/10 pl-3 pr-1 py-1 text-sm text-foreground"
            >
              {skill}
              <button
                type="button"
                onClick={() => onChange(value.filter((s) => s !== skill))}
                className="rounded-full p-1 text-muted-foreground hover:bg-card hover:text-foreground"
                aria-label={`Убрать ${skill}`}
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </span>
          ))}
        </div>
      ) : null}

      <div className="flex gap-2">
        <Input
          label="Добавить навык"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              addSkill(draft);
            }
          }}
          placeholder="TypeScript, React…"
        />
        <Button
          type="button"
          variant="secondary"
          className="mt-7 shrink-0"
          onClick={() => addSkill(draft)}
        >
          Добавить
        </Button>
      </div>
    </Card>
  );
}
