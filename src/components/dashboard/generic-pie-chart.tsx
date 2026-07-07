"use client";

import { PieSliceTooltip } from "@/components/dashboard/chart-tooltip";
import { Card } from "@/components/ui/card";
import type { RankingRow } from "@/types/dashboard-metrics";
import { Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";

const COLORS = ["#6366f1", "#8b5cf6", "#ec4899", "#f59e0b", "#10b981", "#06b6d4", "#64748b", "#ef4444"];

type Props = {
  title: string;
  subtitle?: string;
  rows: Omit<RankingRow, "rank">[];
  valueLabel?: string;
};

export function GenericPieChart({ title, subtitle, rows, valueLabel = "leads no período" }: Props) {
  const chartData = rows
    .filter((r) => r.value > 0)
    .slice(0, 8)
    .map((r) => ({ name: r.primary, value: r.value }));

  const total = chartData.reduce((sum, item) => sum + item.value, 0);

  return (
    <Card className="flex h-full min-h-[220px] flex-col p-4">
      <div className="mb-3">
        <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-100">{title}</h3>
        {subtitle ? (
          <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">{subtitle}</p>
        ) : (
          <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
            Leads criados no período, agrupados por pipeline
          </p>
        )}
      </div>
      <div className="min-h-0 flex-1">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={chartData}
              dataKey="value"
              nameKey="name"
              cx="50%"
              cy="50%"
              outerRadius="70%"
              label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
              labelLine={false}
            >
              {chartData.map((_, i) => (
                <Cell key={i} fill={COLORS[i % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip content={<PieSliceTooltip total={total} valueLabel={valueLabel} />} />
            <Legend wrapperStyle={{ fontSize: 11 }} />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}
