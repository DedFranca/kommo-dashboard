"use client";

import { SingleSeriesTooltip } from "@/components/dashboard/chart-tooltip";
import { Card } from "@/components/ui/card";
import type { RankingRow } from "@/types/dashboard-metrics";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

type Props = {
  title: string;
  subtitle?: string;
  rows: RankingRow[];
};

export function HorizontalStatusBarChart({ title, subtitle, rows }: Props) {
  const chartData = [...rows]
    .sort((a, b) => a.value - b.value)
    .slice(-12)
    .map((r) => ({ name: r.primary, v: r.value }));

  return (
    <Card className="flex h-full min-h-[320px] flex-col p-4">
      <div className="mb-3">
        <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-100">{title}</h3>
        {subtitle ? <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">{subtitle}</p> : null}
      </div>
      <div className="min-h-0 flex-1">
        {chartData.length === 0 ? (
          <div className="flex h-full items-center justify-center text-sm text-slate-500">Sem dados no período.</div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} layout="vertical" margin={{ top: 4, right: 16, bottom: 4, left: 8 }}>
              <CartesianGrid strokeDasharray="3 3" horizontal={false} className="stroke-slate-200 dark:stroke-slate-700" />
              <XAxis type="number" tick={{ fontSize: 11 }} stroke="#94a3b8" allowDecimals={false} />
              <YAxis type="category" dataKey="name" width={120} tick={{ fontSize: 10 }} stroke="#94a3b8" />
              <Tooltip content={<SingleSeriesTooltip valueLabel="Leads" />} />
              <Bar dataKey="v" name="Leads" fill="#6366f1" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </Card>
  );
}
