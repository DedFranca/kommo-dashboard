"use client";

import { SingleSeriesTooltip } from "@/components/dashboard/chart-tooltip";
import { Card } from "@/components/ui/card";
import type { TimeSeriesPoint } from "@/types/dashboard-metrics";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

type Props = {
  title: string;
  subtitle?: string;
  data: TimeSeriesPoint[];
  dataLabel?: string;
};

export function GenericBarChart({ title, subtitle, data, dataLabel = "Valor" }: Props) {
  const chartData = data.map((d) => ({ name: d.label, v: d.value }));

  return (
    <Card className="flex h-full min-h-[220px] flex-col p-4">
      <div className="mb-3">
        <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-100">{title}</h3>
        {subtitle ? <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">{subtitle}</p> : null}
      </div>
      <div className="min-h-0 flex-1">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} margin={{ top: 8, right: 12, bottom: 4, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-slate-200 dark:stroke-slate-700" />
            <XAxis dataKey="name" tick={{ fontSize: 11 }} stroke="#94a3b8" />
            <YAxis width={36} tick={{ fontSize: 11 }} stroke="#94a3b8" allowDecimals={false} />
            <Tooltip content={<SingleSeriesTooltip valueLabel={dataLabel} />} />
            <Bar dataKey="v" name={dataLabel} fill="#6366f1" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}
