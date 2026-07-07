"use client";

import { PieSliceTooltip } from "@/components/dashboard/chart-tooltip";
import { Card } from "@/components/ui/card";
import type { RankingRow } from "@/types/dashboard-metrics";
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";

const COLORS = ["#6366f1", "#8b5cf6", "#ec4899", "#f59e0b", "#10b981", "#06b6d4", "#64748b", "#ef4444"];

type Props = {
  title: string;
  subtitle?: string;
  rows: RankingRow[];
};

export function PipelineDonutChart({ title, subtitle, rows }: Props) {
  const chartData = rows
    .filter((r) => r.value > 0)
    .slice(0, 8)
    .map((r) => ({ name: r.primary, value: r.value }));

  const total = chartData.reduce((sum, item) => sum + item.value, 0);

  return (
    <Card className="flex h-full min-h-[280px] flex-col p-4">
      <div className="mb-3">
        <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-100">{title}</h3>
        {subtitle ? <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">{subtitle}</p> : null}
      </div>
      <div className="relative min-h-0 flex-1">
        {chartData.length === 0 ? (
          <div className="flex h-full items-center justify-center text-sm text-slate-500">Sem dados no período.</div>
        ) : (
          <>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={chartData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius="55%"
                  outerRadius="78%"
                  paddingAngle={2}
                >
                  {chartData.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip content={<PieSliceTooltip total={total} valueLabel="leads" />} />
              </PieChart>
            </ResponsiveContainer>
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
              <div className="text-center">
                <p className="text-2xl font-bold text-slate-900 dark:text-white">{total.toLocaleString("pt-BR")}</p>
                <p className="text-[10px] uppercase text-slate-500">Total</p>
              </div>
            </div>
          </>
        )}
      </div>
      {chartData.length > 0 ? (
        <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1">
          {chartData.map((item, i) => (
            <div key={item.name} className="flex items-center gap-1.5 text-[10px] text-slate-600 dark:text-slate-300">
              <span className="h-2 w-2 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
              <span className="truncate max-w-[120px]">{item.name}</span>
            </div>
          ))}
        </div>
      ) : null}
    </Card>
  );
}
