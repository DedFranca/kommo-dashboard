"use client";

import { MultiSeriesTooltip } from "@/components/dashboard/chart-tooltip";
import { Card } from "@/components/ui/card";
import type { ResponsiblePerformanceRow } from "@/types/dashboard-metrics";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

type Props = {
  title: string;
  subtitle?: string;
  rows: ResponsiblePerformanceRow[];
};

export function ResponsiblePerformanceChart({ title, subtitle, rows }: Props) {
  const chartData = rows.map((r) => ({
    name: r.name.split(" ")[0],
    fullName: r.name,
    leads: r.leads,
    won: r.won,
    taxa: r.conversionRate,
  }));

  return (
    <Card className="flex h-full min-h-[260px] flex-col p-4">
      <div className="mb-3">
        <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-100">{title}</h3>
        {subtitle ? (
          <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">{subtitle}</p>
        ) : (
          <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
            Leads criados e vendas ganhas no período selecionado
          </p>
        )}
      </div>
      <div className="min-h-0 flex-1">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} margin={{ top: 8, right: 12, bottom: 4, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-slate-200 dark:stroke-slate-700" />
            <XAxis dataKey="name" tick={{ fontSize: 11 }} stroke="#94a3b8" />
            <YAxis width={40} tick={{ fontSize: 11 }} stroke="#94a3b8" allowDecimals={false} />
            <Tooltip content={<MultiSeriesTooltip />} />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            <Bar dataKey="leads" name="Leads no período" fill="#94a3b8" radius={[4, 4, 0, 0]} />
            <Bar dataKey="won" name="Vendas ganhas" fill="#6366f1" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}
