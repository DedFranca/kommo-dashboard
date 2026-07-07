"use client";

import { Card } from "@/components/ui/card";
import type { HeatmapCell } from "@/types/dashboard-metrics";

const DAYS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
const HOURS = Array.from({ length: 24 }, (_, i) => i);

type Props = {
  title: string;
  subtitle?: string;
  cells: HeatmapCell[];
};

function colorForIntensity(intensity: number): string {
  if (intensity <= 0) return "rgb(241 245 249)";
  if (intensity < 0.25) return "rgb(199 210 254)";
  if (intensity < 0.5) return "rgb(129 140 248)";
  if (intensity < 0.75) return "rgb(79 70 229)";
  return "rgb(49 46 129)";
}

export function LeadEntryHeatmap({ title, subtitle, cells }: Props) {
  const grid = new Map<string, number>();
  let max = 0;
  for (const cell of cells) {
    const key = `${cell.dayOfWeek}-${cell.hour}`;
    grid.set(key, cell.value);
    if (cell.value > max) max = cell.value;
  }

  return (
    <Card className="flex h-full min-h-[280px] flex-col p-4">
      <div className="mb-3">
        <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-100">{title}</h3>
        {subtitle ? <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">{subtitle}</p> : null}
      </div>
      <div className="min-h-0 flex-1 overflow-auto">
        <div className="inline-block min-w-full">
          <div className="mb-1 grid grid-cols-[36px_repeat(24,minmax(14px,1fr))] gap-px text-[9px] text-slate-400">
            <div />
            {HOURS.map((h) => (
              <div key={h} className="text-center">
                {h % 3 === 0 ? `${h}h` : ""}
              </div>
            ))}
          </div>
          {DAYS.map((day, dow) => (
            <div key={day} className="mb-px grid grid-cols-[36px_repeat(24,minmax(14px,1fr))] gap-px">
              <div className="flex items-center text-[10px] font-medium text-slate-500">{day}</div>
              {HOURS.map((hour) => {
                const value = grid.get(`${dow}-${hour}`) ?? 0;
                const intensity = max > 0 ? value / max : 0;
                return (
                  <div
                    key={hour}
                    title={`${day} ${hour}h: ${value} leads`}
                    className="aspect-square rounded-sm transition-colors"
                    style={{ backgroundColor: colorForIntensity(intensity) }}
                  />
                );
              })}
            </div>
          ))}
        </div>
        <div className="mt-3 flex items-center justify-end gap-2 text-[10px] text-slate-500">
          <span>Menos</span>
          <div className="flex gap-0.5">
            {[0, 0.25, 0.5, 0.75, 1].map((i) => (
              <div key={i} className="h-3 w-5 rounded-sm" style={{ backgroundColor: colorForIntensity(i) }} />
            ))}
          </div>
          <span>Mais</span>
        </div>
      </div>
    </Card>
  );
}
