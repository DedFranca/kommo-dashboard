"use client";

import { SingleSeriesTooltip } from "@/components/dashboard/chart-tooltip";
import { Card } from "@/components/ui/card";
import type { ClosingTimeStats } from "@/types/dashboard-metrics";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

type Props = {
  title: string;
  subtitle?: string;
  stats: ClosingTimeStats;
};

export function ClosingTimePanel({ title, subtitle, stats }: Props) {
  const chartData = stats.histogram.map((h) => ({ name: h.label, v: h.value }));

  return (
    <Card className="flex h-full min-h-[280px] flex-col p-4">
      <div className="mb-3">
        <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-100">{title}</h3>
        {subtitle ? <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">{subtitle}</p> : null}
      </div>
      <div className="mb-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
        {[
          { label: "Média", value: `${stats.avg}d` },
          { label: "Mediana", value: `${stats.median}d` },
          { label: "Mínimo", value: `${stats.min}d` },
          { label: "Máximo", value: `${stats.max}d` },
        ].map((item) => (
          <div key={item.label} className="rounded-lg bg-slate-50 px-3 py-2 dark:bg-slate-900">
            <p className="text-[10px] font-semibold uppercase text-slate-500">{item.label}</p>
            <p className="text-lg font-bold text-slate-900 dark:text-white">{item.value}</p>
          </div>
        ))}
      </div>
      <div className="min-h-0 flex-1">
        {chartData.every((d) => d.v === 0) ? (
          <div className="flex h-full items-center justify-center text-sm text-slate-500">
            Sem vendas fechadas no período.
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 4, right: 8, bottom: 4, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-slate-200 dark:stroke-slate-700" />
              <XAxis dataKey="name" tick={{ fontSize: 10 }} stroke="#94a3b8" />
              <YAxis width={32} tick={{ fontSize: 10 }} stroke="#94a3b8" allowDecimals={false} />
              <Tooltip content={<SingleSeriesTooltip valueLabel="Vendas" />} />
              <Bar dataKey="v" name="Vendas" fill="#10b981" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </Card>
  );
}
