"use client";

import { useState } from "react";
import type { InternshipLogEntry } from "@/lib/types";
import {
  internshipErrorMessage,
  LOG_DESC_MAX,
  LOG_HOURS_MAX,
  LOG_HOURS_MIN,
  validateLogHours,
} from "@/lib/internship-errors";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/cn";

type InternshipLogPanelProps = {
  totalHours: number;
  logEntries: InternshipLogEntry[];
  canAdd: boolean;
  onAdd: (payload: { date: string; hours: number; description?: string }) => Promise<void>;
};

export function InternshipLogPanel({
  totalHours,
  logEntries,
  canAdd,
  onAdd,
}: InternshipLogPanelProps) {
  const [logDate, setLogDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [logHours, setLogHours] = useState("");
  const [logDesc, setLogDesc] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    const hours = parseFloat(logHours);
    const hoursError = validateLogHours(hours);
    if (!logDate) {
      setError("Укажите дату.");
      return;
    }
    if (hoursError) {
      setError(hoursError);
      return;
    }
    if (logDesc.length > LOG_DESC_MAX) {
      setError(`Описание не длиннее ${LOG_DESC_MAX} символов.`);
      return;
    }

    setSaving(true);
    setError(null);
    try {
      await onAdd({
        date: logDate,
        hours,
        description: logDesc.trim() || undefined,
      });
      setLogHours("");
      setLogDesc("");
    } catch (e) {
      setError(internshipErrorMessage(e, "Ошибка сохранения"));
    } finally {
      setSaving(false);
    }
  }

  const sorted = logEntries
    .slice()
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  return (
    <Card>
      <CardTitle as="h2" className="mb-1 text-base">
        Журнал часов
      </CardTitle>
      <CardDescription className="mb-5">
        Всего отработано:{" "}
        <strong className="text-foreground">{totalHours} ч</strong>
        {!canAdd ? " · запись закрыта после завершения стажировки" : null}
      </CardDescription>

      {canAdd ? (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-[1fr_1fr_2fr_auto] lg:items-end">
            <Input
              label="Дата"
              type="date"
              value={logDate}
              onChange={(e) => setLogDate(e.target.value)}
            />
            <Input
              label="Часы"
              type="number"
              min={LOG_HOURS_MIN}
              max={LOG_HOURS_MAX}
              step="0.25"
              value={logHours}
              onChange={(e) => setLogHours(e.target.value)}
              placeholder="4"
            />
            <Input
              label="Описание"
              value={logDesc}
              onChange={(e) => setLogDesc(e.target.value)}
              maxLength={LOG_DESC_MAX}
              placeholder="Что сделали?"
            />
            <Button type="button" disabled={saving} onClick={() => void submit()}>
              {saving ? "…" : "Добавить"}
            </Button>
          </div>
          {error ? <p className="mt-3 text-sm text-danger">{error}</p> : null}
        </>
      ) : null}

      {sorted.length > 0 ? (
        <div
          className={cn(
            "overflow-x-auto rounded-xl border border-border",
            canAdd ? "mt-6" : "",
          )}
        >
          <table className="w-full min-w-[28rem] border-collapse text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/40 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                <th className="px-4 py-2.5 text-left">Дата</th>
                <th className="px-4 py-2.5 text-right">Часы</th>
                <th className="px-4 py-2.5 text-left">Описание</th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((entry) => (
                <tr
                  key={entry.id}
                  className="border-b border-border/60 last:border-0"
                >
                  <td className="px-4 py-3 text-muted-foreground">
                    {new Date(entry.date).toLocaleDateString("ru-RU")}
                  </td>
                  <td className="px-4 py-3 text-right font-semibold tabular-nums text-foreground">
                    {entry.hours} ч
                  </td>
                  <td className="px-4 py-3 text-foreground">
                    {entry.description ?? "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="mt-4 text-center text-sm text-muted-foreground">
          {canAdd ? "Пока нет записей — добавьте первую." : "Записей не было."}
        </p>
      )}
    </Card>
  );
}
