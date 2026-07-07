"use client";

import { Card } from "@/components/ui/card";
import type { RankingRow } from "@/types/dashboard-metrics";

type Props = {
  title: string;
  rows: RankingRow[];
  primaryLabel: string;
  secondaryLabel: string;
  valueLabel?: string;
};

export function RankingTable({ title, rows, primaryLabel, secondaryLabel, valueLabel = "Lead Ganho" }: Props) {
  return (
    <Card className="flex h-full min-h-0 flex-col overflow-hidden p-0">
      <div className="border-b border-border bg-slate-50 px-4 py-3 dark:bg-slate-900/80">
        <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-100">{title}</h3>
      </div>
      <div className="min-h-0 flex-1 overflow-auto">
        <table className="w-full border-collapse text-left text-sm">
          <thead className="sticky top-0 bg-slate-100 text-xs text-slate-600 dark:bg-slate-800 dark:text-slate-300">
            <tr>
              <th className="w-10 px-3 py-2 font-semibold">#</th>
              <th className="px-3 py-2 font-semibold">{primaryLabel}</th>
              <th className="px-3 py-2 font-semibold">{secondaryLabel}</th>
              <th className="px-3 py-2 text-right font-semibold">{valueLabel}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {rows.map((row) => (
              <tr key={`${row.rank}-${row.primary}`} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50">
                <td className="px-3 py-2 text-slate-500">{row.rank}.</td>
                <td className="max-w-[200px] truncate px-3 py-2 font-medium text-slate-800 dark:text-slate-200">
                  {row.primary}
                </td>
                <td className="px-3 py-2 text-slate-600 dark:text-slate-400">{row.secondary ?? "—"}</td>
                <td className="px-3 py-2 text-right tabular-nums font-semibold text-indigo-700 dark:text-indigo-300">
                  {row.value}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
