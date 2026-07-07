"use client";

import { DateRangePicker } from "@/components/dashboard/date-range-picker";
import {
  addMonths,
  endOfMonth,
  getLastSixMonthsRange,
  startOfMonth,
  type DateRange,
} from "@/lib/date-range";
import { cn } from "@/lib/utils";

type PresetId = "this-month" | "last-3" | "last-6" | "this-year";

const PRESETS: { id: PresetId; label: string; range: () => DateRange }[] = [
  {
    id: "this-month",
    label: "Este mês",
    range: () => {
      const now = new Date();
      return { from: startOfMonth(now), to: endOfMonth(now) };
    },
  },
  {
    id: "last-3",
    label: "Últimos 3 meses",
    range: () => {
      const now = new Date();
      return { from: startOfMonth(addMonths(now, -2)), to: endOfMonth(now) };
    },
  },
  {
    id: "last-6",
    label: "Últimos 6 meses",
    range: getLastSixMonthsRange,
  },
  {
    id: "this-year",
    label: "Este ano",
    range: () => {
      const now = new Date();
      return { from: new Date(now.getFullYear(), 0, 1), to: endOfMonth(now) };
    },
  },
];

type Props = {
  value: DateRange;
  onChange: (range: DateRange) => void;
};

function isSameRange(a: DateRange, b: DateRange): boolean {
  return (
    a.from.getFullYear() === b.from.getFullYear() &&
    a.from.getMonth() === b.from.getMonth() &&
    a.from.getDate() === b.from.getDate() &&
    a.to.getFullYear() === b.to.getFullYear() &&
    a.to.getMonth() === b.to.getMonth() &&
    a.to.getDate() === b.to.getDate()
  );
}

export function AnalyticsDatePicker({ value, onChange }: Props) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
      <div className="flex flex-wrap gap-1.5">
        {PRESETS.map((preset) => {
          const active = isSameRange(value, preset.range());
          return (
            <button
              key={preset.id}
              type="button"
              onClick={() => onChange(preset.range())}
              className={cn(
                "rounded-lg border px-3 py-1.5 text-xs font-semibold transition-colors",
                active
                  ? "border-blue-600 bg-blue-50 text-blue-700"
                  : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50",
              )}
            >
              {preset.label}
            </button>
          );
        })}
      </div>
      <DateRangePicker value={value} onChange={onChange} />
    </div>
  );
}
