"use client";

import { useMemo } from "react";
import { SingleSeriesTooltip } from "@/components/dashboard/chart-tooltip";
import { Card } from "@/components/ui/card";
import type { TimeSeriesPoint } from "@/types/dashboard-metrics";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

const CHART_HEIGHT = 260;

type Props = {
  title: string;
  subtitle?: string;
  data: TimeSeriesPoint[];
  dataLabel?: string;
};

export function LeadsWonChart({ title, subtitle, data, dataLabel = "Valor" }: Props) {
  const chartData = useMemo(() => data.map((d) => ({ name: d.label, v: d.value })), [data]);
  const chartKey = useMemo(
    () => chartData.map((d) => `${d.name}:${d.v}`).join("|"),
    [chartData],
  );

  return (
    <Card className="flex flex-col p-4">
      <div className="mb-3 shrink-0">
        <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-100">{title}</h3>
        {subtitle ? <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">{subtitle}</p> : null}
      </div>
      <div className="w-full shrink-0" style={{ height: CHART_HEIGHT }}>
        {chartData.length === 0 ? (
          <div className="flex h-full items-center justify-center text-sm text-slate-500">
            Sem dados no período selecionado.
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={CHART_HEIGHT} debounce={50}>
            <LineChart key={chartKey} data={chartData} margin={{ top: 8, right: 12, bottom: 4, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-slate-200 dark:stroke-slate-700" />
              <XAxis dataKey="name" tick={{ fontSize: 11 }} stroke="#94a3b8" interval="preserveStartEnd" />
              <YAxis width={36} tick={{ fontSize: 11 }} stroke="#94a3b8" allowDecimals={false} />
              <Tooltip content={<SingleSeriesTooltip valueLabel={dataLabel} />} />
              <Line
                type="monotone"
                dataKey="v"
                name={dataLabel}
                stroke="#4f46e5"
                strokeWidth={2.5}
                dot={{ r: 3, fill: "#4f46e5" }}
                activeDot={{ r: 5 }}
                isAnimationActive={false}
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>
    </Card>
  );
}
