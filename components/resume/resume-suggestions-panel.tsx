"use client";

import { useState } from "react";
import { Sparkles } from "lucide-react";
import { routes } from "@/lib/api-routes";
import { useSession } from "@/components/providers/session-provider";
import type { ResumeSuggestionLanguage, ResumeSuggestionsResponse } from "@/lib/types";
import { resumeErrorMessage } from "@/lib/resume-errors";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/cn";

const LANGUAGE_OPTIONS: { value: ResumeSuggestionLanguage; label: string }[] = [
  { value: "ru", label: "Русский" },
  { value: "kk", label: "Қазақша" },
  { value: "en", label: "English" },
];

type ResumeSuggestionsPanelProps = {
  draftId: string;
};

export function ResumeSuggestionsPanel({ draftId }: ResumeSuggestionsPanelProps) {
  const { api } = useSession();
  const [language, setLanguage] = useState<ResumeSuggestionLanguage>("ru");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<string[] | null>(null);

  async function fetchSuggestions() {
    setLoading(true);
    setError(null);
    setSuggestions(null);
    try {
      const res = await api.get<ResumeSuggestionsResponse>(
        `${routes.resume.suggestions(draftId)}?language=${language}`,
      );
      setSuggestions(res.suggestions ?? []);
    } catch (e) {
      setError(resumeErrorMessage(e, "AI временно недоступен"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card>
      <CardTitle className="flex items-center gap-2">
        <Sparkles className="h-4 w-4 text-accent" />
        AI-советы
      </CardTitle>
      <CardDescription className="mb-4">
        Рекомендации по улучшению резюме на выбранном языке.
      </CardDescription>

      <div className="mb-3 flex flex-wrap gap-2">
        {LANGUAGE_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            type="button"
            onClick={() => setLanguage(opt.value)}
            className={cn(
              "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
              language === opt.value
                ? "border-accent bg-accent text-accent-foreground"
                : "border-border bg-card text-foreground hover:bg-muted/60",
            )}
          >
            {opt.label}
          </button>
        ))}
      </div>

      <Button
        type="button"
        variant="secondary"
        className="w-full"
        disabled={loading}
        onClick={() => void fetchSuggestions()}
      >
        {loading ? "Анализ…" : "Улучшить"}
      </Button>

      {error ? (
        <p className="mt-3 rounded-xl border border-danger/30 bg-danger/5 px-3 py-2 text-sm text-danger">
          {error}
        </p>
      ) : null}

      {suggestions ? (
        <div className="mt-4 space-y-2">
          {suggestions.length === 0 ? (
            <p className="text-sm text-muted-foreground">Советов пока нет.</p>
          ) : (
            <ul className="space-y-2">
              {suggestions.map((tip, i) => (
                <li
                  key={i}
                  className="rounded-lg border border-border/70 bg-muted/30 px-3 py-2 text-sm leading-relaxed text-foreground"
                >
                  {tip}
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : null}
    </Card>
  );
}
