"use client";

import { Clock, Gauge, Timer, Turtle } from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { ClosingTimeStats } from "@/types/dashboard-metrics";
import { cn } from "@/lib/utils";

type Props = {
  stats: ClosingTimeStats;
};

function MetricCard({
  title,
  value,
  icon: Icon,
  iconBg,
  iconColor,
}: {
  title: string;
  value: string;
  icon: typeof Clock;
  iconBg: string;
  iconColor: string;
}) {
  return (
    <div className="flex flex-col rounded-2xl border border-slate-200/80 bg-white p-5 shadow-[0_8px_30px_rgba(15,23,42,0.06)]">
      <div className="flex items-center gap-2">
        <span className={cn("flex h-10 w-10 items-center justify-center rounded-full", iconBg)}>
          <Icon className={cn("h-5 w-5", iconColor)} strokeWidth={2} />
        </span>
        <p className="text-sm font-medium text-slate-500">{title}</p>
      </div>
      <p className="mt-4 text-3xl font-bold tracking-tight text-slate-900">{value}</p>
    </div>
  );
}

function findMedianBucketIndex(histogram: ClosingTimeStats["histogram"], median: number): number {
  const bounds = [
    { min: 0, max: 7 },
    { min: 8, max: 14 },
    { min: 15, max: 30 },
    { min: 31, max: 60 },
    { min: 61, max: 90 },
    { min: 91, max: Infinity },
  ];
  const idx = bounds.findIndex((b) => median >= b.min && median <= b.max);
  return idx >= 0 ? idx : 0;
}

export function ClosingTimeKpi({ stats }: Props) {
  const medianIdx = findMedianBucketIndex(stats.histogram, stats.median);
  const chartData = stats.histogram.map((h) => ({ name: h.label, value: h.value }));

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          title="Tempo médio"
          value={`${stats.avg} dias`}
          icon={Clock}
          iconBg="bg-blue-100"
          iconColor="text-blue-600"
        />
        <MetricCard
          title="Mediana"
          value={`${stats.median} dias`}
          icon={Gauge}
          iconBg="bg-violet-100"
          iconColor="text-violet-600"
        />
        <MetricCard
          title="Mais rápido"
          value={`${stats.min} dias`}
          icon={Timer}
          iconBg="bg-emerald-100"
          iconColor="text-emerald-600"
        />
        <MetricCard
          title="Mais lento"
          value={`${stats.max} dias`}
          icon={Turtle}
          iconBg="bg-amber-100"
          iconColor="text-amber-600"
        />
      </div>

      <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-[0_8px_30px_rgba(15,23,42,0.06)]">
        <h3 className="mb-4 text-sm font-semibold text-slate-800">Distribuição do tempo de fechamento</h3>
        {chartData.length === 0 ? (
          <p className="text-sm text-slate-500">Sem fechamentos no período.</p>
        ) : (
          <div className="h-56 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: "#64748b" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: "#64748b" }} axisLine={false} tickLine={false} allowDecimals={false} />
                <Tooltip
                  formatter={(value: number) => [`${value} leads`, "Fechamentos"]}
                  contentStyle={{ borderRadius: 8, border: "1px solid #e2e8f0", fontSize: 12 }}
                />
                <Bar dataKey="value" radius={[4, 4, 0, 0]} maxBarSize={48} isAnimationActive={false}>
                  {chartData.map((_, index) => (
                    <Cell key={chartData[index].name} fill={index === medianIdx ? "#8b5cf6" : "#3b82f6"} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    </div>
  );
}
