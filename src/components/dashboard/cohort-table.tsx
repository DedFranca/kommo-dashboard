"use client";

import { Card } from "@/components/ui/card";
import type { CohortRow } from "@/types/dashboard-metrics";

type Props = {
  title: string;
  rows: CohortRow[];
  total: CohortRow;
};

function pct(n: number) {
  return `${n.toFixed(2).replace(".", ",")}%`;
}

export function CohortTable({ title, rows, total }: Props) {
  return (
    <Card className="flex h-full min-h-0 flex-col overflow-hidden p-0">
      <div className="border-b border-border bg-slate-50 px-4 py-3 dark:bg-slate-900/80">
        <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-100">{title}</h3>
      </div>
      <div className="min-h-0 flex-1 overflow-auto">
        <table className="w-full min-w-[720px] border-collapse text-left text-xs">
          <thead className="sticky top-0 z-10 bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300">
            <tr>
              <th className="whitespace-nowrap px-3 py-2 font-semibold">Semana com Data</th>
              <th className="px-3 py-2 font-semibold">Leads</th>
              <th className="px-3 py-2 font-semibold">Total Conversões</th>
              <th className="px-3 py-2 font-semibold">% Sem 0</th>
              <th className="px-3 py-2 font-semibold">% Sem 1</th>
              <th className="px-3 py-2 font-semibold">% Sem 2</th>
              <th className="px-3 py-2 font-semibold">% Sem 3</th>
              <th className="px-3 py-2 font-semibold">% Mês 0</th>
              <th className="px-3 py-2 font-semibold">% Mês 1</th>
              <th className="px-3 py-2 font-semibold">Taxa de conversão</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {rows.map((row) => (
              <tr key={row.weekLabel} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50">
                <td className="whitespace-nowrap px-3 py-2 font-medium text-slate-800 dark:text-slate-200">
                  {row.weekLabel}
                </td>
                <td className="px-3 py-2 tabular-nums">{row.leads.toLocaleString("pt-BR")}</td>
                <td className="px-3 py-2 tabular-nums">{row.conversions}</td>
                <td className="px-3 py-2 tabular-nums">{pct(row.pctWeek0)}</td>
                <td className="px-3 py-2 tabular-nums">{pct(row.pctWeek1)}</td>
                <td className="px-3 py-2 tabular-nums">{pct(row.pctWeek2)}</td>
                <td className="px-3 py-2 tabular-nums">{pct(row.pctWeek3)}</td>
                <td className="px-3 py-2 tabular-nums">{pct(row.pctMonth0)}</td>
                <td className="px-3 py-2 tabular-nums">{pct(row.pctMonth1)}</td>
                <td className="px-3 py-2 tabular-nums font-medium text-indigo-700 dark:text-indigo-300">
                  {pct(row.conversionRate)}
                </td>
              </tr>
            ))}
            <tr className="bg-slate-100/90 font-semibold dark:bg-slate-800/90">
              <td className="px-3 py-2">{total.weekLabel}</td>
              <td className="px-3 py-2 tabular-nums">{total.leads.toLocaleString("pt-BR")}</td>
              <td className="px-3 py-2 tabular-nums">{total.conversions}</td>
              <td className="px-3 py-2 tabular-nums">{pct(total.pctWeek0)}</td>
              <td className="px-3 py-2 tabular-nums">{pct(total.pctWeek1)}</td>
              <td className="px-3 py-2 tabular-nums">{pct(total.pctWeek2)}</td>
              <td className="px-3 py-2 tabular-nums">{pct(total.pctWeek3)}</td>
              <td className="px-3 py-2 tabular-nums">{pct(total.pctMonth0)}</td>
              <td className="px-3 py-2 tabular-nums">{pct(total.pctMonth1)}</td>
              <td className="px-3 py-2 tabular-nums text-indigo-700 dark:text-indigo-300">
                {pct(total.conversionRate)}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </Card>
  );
}
