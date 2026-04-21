"use client";

import { Fragment, useCallback, useEffect, useMemo, useState } from "react";
import { routes } from "@/lib/api-routes";
import { ApiError } from "@/lib/api-base";
import { RoleGuard } from "@/components/role-guard";
import { useSession } from "@/components/providers/session-provider";
import type {
  ScheduleSlot,
  ScheduleSlotPatch,
  ScheduleSource,
} from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import {
  LoadingHint,
  PageContainer,
  PageHeader,
} from "@/components/layout/page";
import { cn } from "@/lib/cn";
import {
  putFileToPresignedUrl,
  requestPresign,
} from "@/lib/presign-upload";

function minutesToTimeValue(m: number): string {
  const h = Math.floor(m / 60);
  const min = m % 60;
  return `${h.toString().padStart(2, "0")}:${min.toString().padStart(2, "0")}`;
}

function timeValueToMinutes(v: string): number | null {
  const m = /^(\d{1,2}):(\d{2})$/.exec(v.trim());
  if (!m) return null;
  const h = Number(m[1]);
  const min = Number(m[2]);
  if (
    Number.isNaN(h) ||
    Number.isNaN(min) ||
    h < 0 ||
    h > 23 ||
    min < 0 ||
    min > 59
  ) {
    return null;
  }
  return h * 60 + min;
}

const days = ["Вс", "Пн", "Вт", "Ср", "Чт", "Пт", "Сб"];

const daysFull = [
  "Воскресенье",
  "Понедельник",
  "Вторник",
  "Среда",
  "Четверг",
  "Пятница",
  "Суббота",
];

function occupancyLabel(n: number): string {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod100 >= 11 && mod100 <= 14) return `${n} занятий`;
  if (mod10 === 1) return `${n} занятие`;
  if (mod10 >= 2 && mod10 <= 4) return `${n} занятия`;
  return `${n} занятий`;
}

function groupSlotsByDay(slots: ScheduleSlot[]): Map<number, ScheduleSlot[]> {
  const map = new Map<number, ScheduleSlot[]>();
  for (const s of slots) {
    const list = map.get(s.dayOfWeek) ?? [];
    list.push(s);
    map.set(s.dayOfWeek, list);
  }
  for (const list of map.values()) {
    list.sort((a, b) => a.startMinute - b.startMinute);
  }
  return map;
}

/** Левый акцент + лёгкий фон, чтобы дни отличались с первого взгляда */
const dayRowTone: Record<number, string> = {
  0: "border-l-[3px] border-l-amber-500/85 bg-gradient-to-r from-amber-500/[0.07] to-transparent",
  1: "border-l-[3px] border-l-sky-500/85 bg-gradient-to-r from-sky-500/[0.08] to-transparent",
  2: "border-l-[3px] border-l-violet-500/80 bg-gradient-to-r from-violet-500/[0.07] to-transparent",
  3: "border-l-[3px] border-l-emerald-500/85 bg-gradient-to-r from-emerald-500/[0.07] to-transparent",
  4: "border-l-[3px] border-l-orange-500/80 bg-gradient-to-r from-orange-500/[0.07] to-transparent",
  5: "border-l-[3px] border-l-rose-500/75 bg-gradient-to-r from-rose-500/[0.06] to-transparent",
  6: "border-l-[3px] border-l-cyan-600/80 bg-gradient-to-r from-cyan-600/[0.07] to-transparent",
};

const dayHeaderTone: Record<number, string> = {
  0: "from-amber-500/15 to-amber-500/[0.02]",
  1: "from-sky-500/15 to-sky-500/[0.02]",
  2: "from-violet-500/14 to-violet-500/[0.02]",
  3: "from-emerald-500/14 to-emerald-500/[0.02]",
  4: "from-orange-500/14 to-orange-500/[0.02]",
  5: "from-rose-500/12 to-rose-500/[0.02]",
  6: "from-cyan-600/14 to-cyan-600/[0.02]",
};

const selectClass =
  "w-full min-w-[4.5rem] rounded-lg border border-border bg-card px-2.5 py-2 text-sm shadow-sm outline-none transition-[border-color,box-shadow] focus-visible:border-accent/60 focus-visible:ring-2 focus-visible:ring-ring/25";

const cellInputClass =
  "w-full min-w-0 rounded-lg border border-border bg-card px-2.5 py-2 text-sm text-card-foreground shadow-sm outline-none transition-[box-shadow,border-color] focus-visible:border-accent/60 focus-visible:ring-2 focus-visible:ring-ring/25";

const timeInputClass =
  "min-w-[5.5rem] flex-1 rounded-lg border border-border bg-card px-2 py-1.5 font-mono text-sm tabular-nums shadow-sm outline-none focus-visible:border-accent/60 focus-visible:ring-2 focus-visible:ring-ring/25";

function ScheduleSlotTableRow({
  slot,
  rowNum,
  dayIdx,
  onUpdated,
}: {
  slot: ScheduleSlot;
  rowNum: number;
  dayIdx: number;
  onUpdated: (s: ScheduleSlot) => void;
}) {
  const { api } = useSession();
  const [dayOfWeek, setDayOfWeek] = useState(slot.dayOfWeek);
  const [start, setStart] = useState(minutesToTimeValue(slot.startMinute));
  const [end, setEnd] = useState(minutesToTimeValue(slot.endMinute));
  const [label, setLabel] = useState(slot.label ?? "");
  const [saving, setSaving] = useState(false);
  const [rowError, setRowError] = useState<string | null>(null);

  useEffect(() => {
    setDayOfWeek(slot.dayOfWeek);
    setStart(minutesToTimeValue(slot.startMinute));
    setEnd(minutesToTimeValue(slot.endMinute));
    setLabel(slot.label ?? "");
  }, [
    slot.id,
    slot.dayOfWeek,
    slot.startMinute,
    slot.endMinute,
    slot.label,
  ]);

  async function save() {
    setRowError(null);
    const sm = timeValueToMinutes(start);
    const em = timeValueToMinutes(end);
    if (sm === null || em === null) {
      setRowError("Укажите время в формате ЧЧ:ММ");
      return;
    }
    if (em <= sm) {
      setRowError("Конец интервала должен быть позже начала");
      return;
    }
    const labelNorm = label.trim() || null;
    const patch: ScheduleSlotPatch = {};
    if (dayOfWeek !== slot.dayOfWeek) patch.dayOfWeek = dayOfWeek;
    if (sm !== slot.startMinute) patch.startMinute = sm;
    if (em !== slot.endMinute) patch.endMinute = em;
    if (labelNorm !== (slot.label ?? null)) patch.label = labelNorm;
    if (Object.keys(patch).length === 0) return;

    setSaving(true);
    try {
      const updated = await api.patch<ScheduleSlot>(
        routes.schedule.slotById(slot.id),
        patch,
      );
      onUpdated(updated);
    } catch (e) {
      setRowError(e instanceof ApiError ? e.message : "Не удалось сохранить");
    } finally {
      setSaving(false);
    }
  }

  const dirty =
    dayOfWeek !== slot.dayOfWeek ||
    timeValueToMinutes(start) !== slot.startMinute ||
    timeValueToMinutes(end) !== slot.endMinute ||
    (label.trim() || null) !== (slot.label ?? null);

  const sm = timeValueToMinutes(start);
  const em = timeValueToMinutes(end);
  const rangeOk = sm !== null && em !== null && em > sm;
  const durationMin =
    rangeOk && sm !== null && em !== null ? em - sm : null;

  const tone = dayRowTone[dayIdx] ?? dayRowTone[1];

  return (
    <Fragment>
      <tr className={cn("border-b border-border/60 transition-colors hover:bg-muted/25", tone)}>
        <td className="align-middle px-2 py-2.5 sm:px-3">
          <span
            className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-card text-xs font-bold tabular-nums text-foreground shadow-sm ring-1 ring-border/80"
            title="Номер пары в этот день"
          >
            {rowNum}
          </span>
        </td>
        <td className="align-top px-1 py-2.5 sm:px-2">
          <div className="flex min-w-[11rem] flex-col gap-2 sm:min-w-[13rem]">
            <div className="flex items-baseline gap-2">
              <span className="font-mono text-base font-semibold tabular-nums tracking-tight text-foreground">
                {sm !== null && em !== null ? (
                  <>
                    {minutesToTimeValue(sm)}
                    <span className="mx-1.5 font-normal text-muted-foreground">
                      —
                    </span>
                    {minutesToTimeValue(em)}
                  </>
                ) : (
                  "—"
                )}
              </span>
              {durationMin != null ? (
                <span
                  className="rounded-md bg-muted/80 px-1.5 py-0.5 text-[11px] font-medium text-muted-foreground"
                  title="Длительность"
                >
                  {durationMin} мин
                </span>
              ) : null}
            </div>
            <div className="flex items-center gap-1.5">
              <input
                type="time"
                value={start}
                onChange={(e) => setStart(e.target.value)}
                className={timeInputClass}
                aria-label="Время начала"
              />
              <span className="shrink-0 text-muted-foreground">–</span>
              <input
                type="time"
                value={end}
                onChange={(e) => setEnd(e.target.value)}
                className={timeInputClass}
                aria-label="Время окончания"
              />
            </div>
          </div>
        </td>
        <td className="align-middle px-2 py-2.5 sm:min-w-[12rem]">
          <input
            type="text"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder="Название занятия"
            className={cellInputClass}
            aria-label="Название занятия"
          />
        </td>
        <td className="align-middle px-2 py-2.5 sm:w-[7.5rem]">
          <select
            className={selectClass}
            value={dayOfWeek}
            onChange={(e) => setDayOfWeek(Number(e.target.value))}
            aria-label="День недели"
          >
            {days.map((d, i) => (
              <option key={d} value={i}>
                {d}
              </option>
            ))}
          </select>
        </td>
        <td className="align-middle px-2 py-2.5 sm:pr-3">
          <Button
            type="button"
            variant="secondary"
            className="whitespace-nowrap px-3 py-2 text-xs sm:text-sm"
            disabled={!dirty || saving}
            onClick={() => void save()}
          >
            {saving ? "…" : "Сохранить"}
          </Button>
        </td>
      </tr>
      {rowError ? (
        <tr className={tone}>
          <td
            colSpan={5}
            className="border-b border-border/60 px-3 pb-3 pt-0 text-sm text-danger"
          >
            {rowError}
          </td>
        </tr>
      ) : null}
    </Fragment>
  );
}

export default function SchedulePage() {
  const { api, accessToken } = useSession();
  const [sources, setSources] = useState<ScheduleSource[]>([]);
  const [slots, setSlots] = useState<ScheduleSlot[]>([]);
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [s, sl] = await Promise.all([
        api.get<ScheduleSource[]>(routes.schedule.sources),
        api.get<ScheduleSlot[]>(routes.schedule.slots),
      ]);
      setSources(s);
      setSlots(sl);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Ошибка загрузки");
    } finally {
      setLoading(false);
    }
  }, [api]);

  useEffect(() => {
    void load();
  }, [load]);

  async function uploadSchedule() {
    if (!file) return;
    setUploading(true);
    setError(null);
    try {
      const presign = await requestPresign(api, file);
      await putFileToPresignedUrl(presign.uploadUrl, file);
      await api.post<ScheduleSource>(routes.schedule.sources, {
        storageKey: presign.storageKey,
        mimeType: file.type || "application/octet-stream",
      });
      setFile(null);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Ошибка загрузки");
    } finally {
      setUploading(false);
    }
  }

  function mergeSlot(updated: ScheduleSlot) {
    setSlots((prev) => prev.map((s) => (s.id === updated.id ? updated : s)));
  }

  async function downloadIcs() {
    try {
      const base = (process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3000/api").replace(/\/$/, "");
      const url = `${base}${routes.calendar.ics}`;
      const response = await fetch(url, {
        headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : {},
      });
      if (!response.ok) throw new Error("Не удалось получить файл");
      const blob = await response.blob();
      const blobUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = blobUrl;
      a.download = "schedule.ics";
      a.click();
      URL.revokeObjectURL(blobUrl);
    } catch {
      setError("Не удалось скачать .ics — убедитесь, что расписание загружено");
    }
  }

  const slotsByDay = useMemo(() => groupSlotsByDay(slots), [slots]);
  const dayIndicesInOrder = useMemo(
    () =>
      [1, 2, 3, 4, 5, 6, 0].filter((d) => slotsByDay.has(d)),
    [slotsByDay],
  );

  return (
    <RoleGuard allow={["STUDENT"]}>
      <PageContainer>
        <PageHeader
          title="Расписание"
          description="Загрузите PDF расписания из журнала — система извлечёт слоты автоматически."
          action={
            slots.length > 0 ? (
              <Button
                type="button"
                variant="secondary"
                onClick={() => void downloadIcs()}
              >
                Экспорт в Google Calendar
              </Button>
            ) : undefined
          }
        />

        {error ? (
          <p className="mb-6 rounded-xl border border-danger/30 bg-danger/5 px-4 py-3 text-sm text-danger">
            {error}
          </p>
        ) : null}

        <Card className="mb-8">
          <CardTitle as="h2">Загрузить файл</CardTitle>
          <CardDescription className="mb-6">
            После PUT в хранилище создаётся запись источника (парсинг в фоне).
          </CardDescription>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
            <label className="flex min-h-[52px] flex-1 cursor-pointer flex-col justify-center rounded-xl border-2 border-dashed border-border bg-muted/30 px-4 py-3 transition-colors hover:border-accent/40 hover:bg-muted/50">
              <span className="text-sm font-medium text-foreground">
                {file ? file.name : "Выберите файл"}
              </span>
              <span className="text-xs text-muted-foreground">
                PDF, PNG, JPEG…
              </span>
              <input
                type="file"
                className="sr-only"
                accept="application/pdf,image/*"
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              />
            </label>
            <Button
              type="button"
              disabled={!file || uploading}
              onClick={() => void uploadSchedule()}
            >
              {uploading ? "Загрузка…" : "Загрузить"}
            </Button>
          </div>
        </Card>

        <Card className="mb-8">
          <CardTitle as="h2">Источники</CardTitle>
          <CardDescription className="mb-4">
            GET /schedule/sources — статус парсинга (parseStatus).
          </CardDescription>
          {loading ? (
            <LoadingHint />
          ) : sources.length === 0 ? (
            <p className="rounded-xl bg-muted/50 py-8 text-center text-sm text-muted-foreground">
              Пока нет загруженных файлов.
            </p>
          ) : (
            <ul className="space-y-3">
              {sources.map((s) => (
                <li
                  key={s.id}
                  className="rounded-xl border border-border/80 bg-muted/30 px-4 py-3 text-sm"
                >
                  <span className="block font-mono text-xs text-muted-foreground break-all">
                    {s.storageKey}
                  </span>
                  <span className="mt-2 inline-flex flex-wrap gap-2 text-xs text-muted-foreground">
                    <span className="rounded-md bg-card px-2 py-0.5">{s.mimeType}</span>
                    <span className="rounded-md bg-card px-2 py-0.5">
                      парсинг: {s.parseStatus}
                    </span>
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card>
          <CardTitle as="h2">Недельное расписание</CardTitle>
          <CardDescription className="mb-4">
            Строки сгруппированы по дням: сверху крупно время и длительность, ниже
            можно поправить интервал и сохранить.
          </CardDescription>
          {loading ? (
            <LoadingHint />
          ) : slots.length === 0 ? (
            <p className="rounded-xl bg-muted/50 py-8 text-center text-sm text-muted-foreground">
              Слотов пока нет — загрузите расписание или дождитесь парсинга.
            </p>
          ) : (
            <div className="overflow-x-auto rounded-2xl border border-border/80 bg-card shadow-[var(--shadow-card)]">
              <table className="w-full min-w-[min(100%,52rem)] border-collapse text-left">
                <thead>
                  <tr className="border-b border-border bg-muted/40 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    <th scope="col" className="px-2 py-3 sm:px-3 w-14">
                      №
                    </th>
                    <th scope="col" className="px-1 py-3 sm:px-2">
                      Время
                    </th>
                    <th scope="col" className="px-2 py-3 sm:min-w-[12rem]">
                      Занятие
                    </th>
                    <th scope="col" className="px-2 py-3 w-[7.5rem]">
                      День
                    </th>
                    <th scope="col" className="px-2 py-3 sm:pr-3 w-[1%] whitespace-nowrap">
                      <span className="sr-only sm:not-sr-only">Действие</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {dayIndicesInOrder.map((dayIdx) => {
                    const daySlots = slotsByDay.get(dayIdx);
                    if (!daySlots?.length) return null;
                    const headerGrad = dayHeaderTone[dayIdx] ?? dayHeaderTone[1];
                    return (
                      <Fragment key={dayIdx}>
                        <tr
                          className={cn(
                            "border-b border-border/80 bg-gradient-to-r text-foreground",
                            headerGrad,
                          )}
                        >
                          <td
                            colSpan={5}
                            className="px-3 py-2.5 sm:px-4"
                          >
                            <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                              <span className="text-[15px] font-bold tracking-tight">
                                {daysFull[dayIdx]}
                              </span>
                              <span className="text-xs font-medium text-muted-foreground">
                                {occupancyLabel(daySlots.length)}
                              </span>
                            </div>
                          </td>
                        </tr>
                        {daySlots.map((slot, i) => (
                          <ScheduleSlotTableRow
                            key={slot.id}
                            slot={slot}
                            rowNum={i + 1}
                            dayIdx={dayIdx}
                            onUpdated={mergeSlot}
                          />
                        ))}
                      </Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </PageContainer>
    </RoleGuard>
  );
}
