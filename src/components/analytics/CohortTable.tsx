"use client";

import { useMemo } from "react";
import { COHORT_LABELS } from "@/lib/kommo/analytics-metrics";
import type { CohortRow } from "@/types/analytics-metrics";
import { normalizeValue } from "@/lib/chart-scale";
import { cn } from "@/lib/utils";

type Props = {
  rows: CohortRow[];
  columnAverages: (number | null)[];
};

export function CohortTable({ rows, columnAverages }: Props) {
  const maxRate = useMemo(() => {
    const nums = rows.flatMap((r) => r.rates.filter((x): x is number => x !== null));
    if (!nums.length) return 15;
    return Math.max(8, Math.min(100, Math.max(...nums) * 1.15));
  }, [rows]);

  if (!rows.length) {
    return <p className="text-sm text-slate-500">Sem dados de coorte.</p>;
  }

  return (
    <div>
      <p className="mb-3 text-xs text-slate-500">
        Cores proporcionais à taxa (0% → {maxRate.toFixed(0).replace(".", ",")}% no período)
      </p>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[640px] border-collapse text-sm">
          <thead>
            <tr className="border-b border-slate-200">
              <th className="px-3 py-2 text-left font-semibold text-slate-700">Mês</th>
              <th className="px-3 py-2 text-right font-semibold text-slate-500">Coorte</th>
              {COHORT_LABELS.map((label) => (
                <th key={label} className="px-3 py-2 text-center font-semibold text-slate-700">
                  {label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.monthKey} className="border-b border-slate-100">
                <td className="px-3 py-2 font-medium text-slate-800">{row.month}</td>
                <td className="px-3 py-2 text-right text-slate-500">{row.cohortSize.toLocaleString("pt-BR")}</td>
                {row.rates.map((rate, colIdx) => {
                  const converters =
                    rate !== null && row.cohortSize > 0 ? Math.round((rate / 100) * row.cohortSize) : 0;
                  const title =
                    rate === null
                      ? "Dados ainda não disponíveis"
                      : `${converters} de ${row.cohortSize} leads converteram até este ponto`;
                  const t = rate !== null ? normalizeValue(rate, maxRate) : 0;
                  const lightness = rate !== null ? 96 - t * 42 : 96;

                  return (
                    <td
                      key={`${row.monthKey}-${colIdx}`}
                      title={title}
                      className={cn(
                        "px-3 py-2 text-center font-medium",
                        rate === null ? "bg-slate-50 text-slate-400" : "text-slate-800",
                      )}
                      style={rate !== null ? { backgroundColor: `hsl(142, 55%, ${lightness}%)` } : undefined}
                    >
                      {rate === null ? "—" : `${rate.toFixed(1).replace(".", ",")}%`}
                    </td>
                  );
                })}
              </tr>
            ))}
            <tr className="bg-slate-50 font-semibold">
              <td className="px-3 py-2 text-slate-700">Média</td>
              <td />
              {columnAverages.map((avg, i) => (
                <td key={i} className="px-3 py-2 text-center text-slate-700">
                  {avg === null ? "—" : `${avg.toFixed(1).replace(".", ",")}%`}
                </td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
