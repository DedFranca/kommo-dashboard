"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import {
  addMonths,
  eachDayInInterval,
  endOfMonth,
  endOfWeek,
  formatDateBR,
  formatMonthYear,
  formatRangeLabel,
  isAfter,
  isBefore,
  isBetweenInclusive,
  isSameDay,
  isSameMonth,
  startOfMonth,
  startOfWeek,
  type DateRange,
} from "@/lib/date-range";
import { Button } from "@/components/ui/button";

type Props = {
  value: DateRange;
  onChange: (range: DateRange) => void;
};

type PickPhase = "start" | "end";

function MonthGrid({
  month,
  range,
  phase,
  hoverDate,
  onPick,
  onHover,
}: {
  month: Date;
  range: DateRange;
  phase: PickPhase;
  hoverDate: Date | null;
  onPick: (d: Date) => void;
  onHover: (d: Date | null) => void;
}) {
  const start = startOfWeek(startOfMonth(month));
  const end = endOfWeek(endOfMonth(month));
  const days = eachDayInInterval(start, end);

  const previewEnd = phase === "end" && hoverDate ? hoverDate : range.to;
  const previewStart = range.from;
  const rangeStart = isBefore(previewStart, previewEnd) ? previewStart : previewEnd;
  const rangeEnd = isAfter(previewStart, previewEnd) ? previewStart : previewEnd;

  return (
    <div>
      <p className="mb-2 text-center text-sm font-semibold capitalize text-slate-800 dark:text-slate-100">
        {formatMonthYear(month)}
      </p>
      <div className="grid grid-cols-7 gap-0.5 text-center text-[11px]">
        {["D", "S", "T", "Q", "Q", "S", "S"].map((d, i) => (
          <span key={i} className="py-1 font-medium text-slate-400">
            {d}
          </span>
        ))}
        {days.map((day) => {
          const inMonth = isSameMonth(day, month);
          const selected =
            isSameDay(day, range.from) ||
            isSameDay(day, range.to) ||
            (hoverDate !== null && phase === "end" && isSameDay(day, hoverDate));
          const inRange =
            isBetweenInclusive(day, rangeStart, rangeEnd) &&
            !isSameDay(day, range.from) &&
            !isSameDay(day, range.to);

          return (
            <button
              key={day.toISOString()}
              type="button"
              disabled={!inMonth}
              onMouseEnter={() => inMonth && onHover(day)}
              onMouseLeave={() => onHover(null)}
              onClick={() => inMonth && onPick(day)}
              className={cn(
                "h-8 rounded-md transition-colors",
                !inMonth && "invisible",
                inMonth && "text-slate-700 hover:bg-indigo-50 dark:text-slate-200 dark:hover:bg-indigo-950",
                inRange && "bg-indigo-100/80 dark:bg-indigo-900/40",
                selected && "bg-indigo-600 font-semibold text-white hover:bg-indigo-700",
              )}
            >
              {day.getDate()}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function DateRangePicker({ value, onChange }: Props) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<DateRange>(value);
  const [phase, setPhase] = useState<PickPhase>("start");
  const [hoverDate, setHoverDate] = useState<Date | null>(null);
  const [viewMonth, setViewMonth] = useState(value.from);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open) {
      setDraft(value);
      setPhase("start");
      setHoverDate(null);
      setViewMonth(value.from);
    }
  }, [open, value]);

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    if (open) document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  function pickDay(day: Date) {
    if (phase === "start") {
      setDraft({ from: day, to: isBefore(day, draft.to) ? draft.to : day });
      setPhase("end");
      return;
    }
    const from = isBefore(day, draft.from) ? day : draft.from;
    const to = isAfter(day, draft.from) ? day : draft.from;
    setDraft({ from, to });
    setPhase("start");
  }

  function apply() {
    const from = isBefore(draft.from, draft.to) ? draft.from : draft.to;
    const to = isAfter(draft.from, draft.to) ? draft.from : draft.to;
    onChange({ from, to });
    setOpen(false);
  }

  return (
    <div className="relative" ref={ref}>
      <Button
        type="button"
        variant="outline"
        className="gap-2 rounded-lg border-slate-200 bg-white text-sm font-normal shadow-sm hover:bg-slate-50"
        onClick={() => setOpen((o) => !o)}
      >
        <span aria-hidden className="text-slate-400">📅</span>
        {formatRangeLabel(value.from, value.to)}
      </Button>

      {open ? (
        <div className="absolute right-0 z-50 mt-2 w-[min(100vw-2rem,520px)] rounded-xl border border-border bg-white p-4 shadow-xl dark:bg-slate-950">
          <p className="mb-3 text-sm text-slate-600 dark:text-slate-300">
            {phase === "start" ? "Selecione a data inicial" : "Selecione a data final"}
            <span className="ml-2 font-medium text-indigo-600 dark:text-indigo-400">
              {formatDateBR(draft.from)} → {formatDateBR(draft.to)}
            </span>
          </p>

          <div className="mb-3 flex items-center justify-between gap-2">
            <button
              type="button"
              className="rounded-lg border border-border px-2 py-1 text-sm hover:bg-slate-50 dark:hover:bg-slate-800"
              onClick={() => setViewMonth((m) => addMonths(m, -1))}
            >
              ‹
            </button>
            <button
              type="button"
              className="rounded-lg border border-border px-2 py-1 text-sm hover:bg-slate-50 dark:hover:bg-slate-800"
              onClick={() => setViewMonth((m) => addMonths(m, 1))}
            >
              ›
            </button>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <MonthGrid
              month={viewMonth}
              range={draft}
              phase={phase}
              hoverDate={hoverDate}
              onPick={pickDay}
              onHover={setHoverDate}
            />
            <MonthGrid
              month={addMonths(viewMonth, 1)}
              range={draft}
              phase={phase}
              hoverDate={hoverDate}
              onPick={pickDay}
              onHover={setHoverDate}
            />
          </div>

          <div className="mt-4 flex flex-wrap items-center justify-end gap-2 border-t border-border pt-3">
            <Button
              type="button"
              variant="ghost"
              className="text-sm"
              onClick={() => {
                setDraft(value);
                setOpen(false);
              }}
            >
              Cancelar
            </Button>
            <Button type="button" className="text-sm" onClick={apply}>
              Aplicar período
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
