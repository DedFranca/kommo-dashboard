"use client";

import { Card } from "@/components/ui/card";
import type { FunnelStage } from "@/types/dashboard-metrics";

type Props = {
  title: string;
  subtitle?: string;
  stages: FunnelStage[];
};

export function KanbanSummaryGrid({ title, subtitle, stages }: Props) {
  return (
    <Card className="flex h-full min-h-[280px] flex-col p-4">
      <div className="mb-3">
        <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-100">{title}</h3>
        {subtitle ? <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">{subtitle}</p> : null}
      </div>
      <div className="grid min-h-0 flex-1 grid-cols-2 gap-2 overflow-y-auto sm:grid-cols-3 lg:grid-cols-4">
        {stages.length === 0 ? (
          <p className="col-span-full text-sm text-slate-500">Sem dados.</p>
        ) : (
          stages.map((stage) => (
            <div
              key={stage.stage}
              className="rounded-lg border border-slate-200 bg-gradient-to-br from-white to-slate-50 p-3 dark:border-slate-700 dark:from-slate-900 dark:to-slate-950"
            >
              <p className="truncate text-xs font-medium text-slate-600 dark:text-slate-300">{stage.stage}</p>
              <p className="mt-1 text-xl font-bold text-slate-900 dark:text-white">
                {stage.count.toLocaleString("pt-BR")}
              </p>
              <p className="text-xs text-indigo-600 dark:text-indigo-400">{stage.pct.toFixed(1).replace(".", ",")}%</p>
            </div>
          ))
        )}
      </div>
    </Card>
  );
}
