"use client";

import { FunnelStageTooltip } from "@/components/dashboard/chart-tooltip";
import { Card } from "@/components/ui/card";
import type { FunnelStage } from "@/types/dashboard-metrics";
import { Cell, Funnel, FunnelChart, LabelList, ResponsiveContainer, Tooltip } from "recharts";

const COLORS = ["#6366f1", "#8b5cf6", "#a855f7", "#10b981", "#06b6d4", "#22c55e"];

type Props = {
  title: string;
  subtitle?: string;
  stages: FunnelStage[];
};

export function ConversionFunnelChart({ title, subtitle, stages }: Props) {
  const chartData = stages.map((s) => ({
    name: s.stage,
    value: s.count,
    pct: s.pct,
    label: `${s.stage}: ${s.count.toLocaleString("pt-BR")} (${s.pct.toFixed(1)}%)`,
  }));

  if (chartData.length === 0) {
    return (
      <Card className="flex h-full min-h-[280px] flex-col p-4">
        <div className="mb-3">
          <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-100">{title}</h3>
          {subtitle ? <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">{subtitle}</p> : null}
        </div>
        <div className="flex flex-1 items-center justify-center text-sm text-slate-500">
          Sem dados no período selecionado.
        </div>
      </Card>
    );
  }

  return (
    <Card className="flex h-full min-h-[280px] flex-col p-4">
      <div className="mb-3">
        <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-100">{title}</h3>
        {subtitle ? (
          <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">{subtitle}</p>
        ) : (
          <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
            Leads criados no período selecionado
          </p>
        )}
      </div>
      <div className="w-full shrink-0" style={{ height: 280 }}>
        <ResponsiveContainer width="100%" height={280} debounce={50}>
          <FunnelChart>
            <Tooltip content={<FunnelStageTooltip />} />
            <Funnel dataKey="value" data={chartData} isAnimationActive={false}>
              {chartData.map((_, i) => (
                <Cell key={i} fill={COLORS[i % COLORS.length]} />
              ))}
              <LabelList position="right" fill="#334155" stroke="none" dataKey="label" />
            </Funnel>
          </FunnelChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}
