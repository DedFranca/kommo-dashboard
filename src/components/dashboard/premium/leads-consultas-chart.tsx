"use client";

import { useMemo } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  LabelList,
} from "recharts";
import type { ComparativePoint } from "@/lib/dashboard/premium-stats";
import type { ChartGrouping } from "@/lib/kommo/executive-metrics";
import { cn } from "@/lib/utils";

const CHART_HEIGHT = 360;

type Props = {
  data: ComparativePoint[];
  grouping: ChartGrouping;
  onGroupingChange: (g: ChartGrouping) => void;
};

const GROUPING_LABELS: Record<ChartGrouping, string> = {
  week: "Semanal",
  month: "Mensal",
};

const SUBTITLES: Record<ChartGrouping, string> = {
  week: "Desempenho semanal do último mês do período selecionado",
  month: "Últimos 6 meses (independente do filtro dos KPIs)",
};

function ChartTooltip({ active, payload, label }: { active?: boolean; payload?: { value: number; name: string; color: string }[]; label?: string }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs shadow-lg">
      <p className="mb-1 font-semibold text-slate-700">{label}</p>
      {payload.map((entry) => (
        <p key={entry.name} style={{ color: entry.color }}>
          {entry.name}: {entry.value.toLocaleString("pt-BR")}
        </p>
      ))}
    </div>
  );
}

export function LeadsConsultasChart({ data, grouping, onGroupingChange }: Props) {
  const chartData = useMemo(
    () =>
      data.map((d) => ({
        name: d.label,
        leads: d.leads,
        consultas: d.consultas,
      })),
    [data],
  );

  const chartKey = useMemo(() => chartData.map((d) => `${d.name}:${d.leads}:${d.consultas}`).join("|"), [chartData]);

  return (
    <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-[0_8px_30px_rgba(15,23,42,0.06)]">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-sm font-bold uppercase tracking-wide text-slate-800">
            Leads Total x Consultas Fechadas
          </h2>
          <p className="mt-1 text-sm text-slate-500">{SUBTITLES[grouping]}</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-3 text-xs text-slate-600">
            <span className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-sm bg-[#3b82f6]" />
              Leads Totais
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-sm bg-[#22c55e]" />
              Consultas Fechadas
            </span>
          </div>
          <div className="flex rounded-lg border border-slate-200 bg-slate-50 p-0.5">
            {(["week", "month"] as ChartGrouping[]).map((g) => (
              <button
                key={g}
                type="button"
                onClick={() => onGroupingChange(g)}
                className={cn(
                  "rounded-md px-3 py-1.5 text-xs font-semibold transition-colors",
                  grouping === g ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700",
                )}
              >
                {GROUPING_LABELS[g]}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="w-full" style={{ height: CHART_HEIGHT }}>
        {chartData.length === 0 ? (
          <div className="flex h-full items-center justify-center text-sm text-slate-500">
            Sem dados no período.
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={CHART_HEIGHT} debounce={50}>
            <BarChart key={chartKey} data={chartData} margin={{ top: 24, right: 8, bottom: 4, left: 0 }} barGap={4}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
              <XAxis dataKey="name" tick={{ fontSize: 11, fill: "#64748b" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: "#64748b" }} axisLine={false} tickLine={false} allowDecimals={false} />
              <Tooltip content={<ChartTooltip />} />
              <Legend wrapperStyle={{ display: "none" }} />
              <Bar dataKey="leads" name="Leads Totais" fill="#3b82f6" radius={[4, 4, 0, 0]} maxBarSize={grouping === "month" ? 48 : 36} isAnimationActive={false}>
                <LabelList dataKey="leads" position="top" fontSize={10} fill="#64748b" />
              </Bar>
              <Bar dataKey="consultas" name="Consultas Fechadas" fill="#22c55e" radius={[4, 4, 0, 0]} maxBarSize={grouping === "month" ? 48 : 36} isAnimationActive={false}>
                <LabelList dataKey="consultas" position="top" fontSize={10} fill="#64748b" />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
