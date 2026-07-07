"use client";

import type { LeadOriginRow } from "@/types/analytics-metrics";

type Props = {
  rows: LeadOriginRow[];
};

export function LeadOriginChart({ rows }: Props) {
  if (!rows.length) {
    return <p className="text-sm text-slate-500">Sem dados de origem no período.</p>;
  }

  const max = rows[0]?.count ?? 1;

  return (
    <div className="space-y-3">
      {rows.map((row) => {
        const widthPct = max > 0 ? Math.round((row.count / max) * 100) : 0;
        return (
          <div key={row.origin} className="grid grid-cols-1 gap-1 sm:grid-cols-[minmax(120px,180px)_1fr_auto] sm:items-center sm:gap-3">
            <span className="truncate text-sm font-medium text-slate-700" title={row.origin}>
              {row.origin}
            </span>
            <div className="h-8 overflow-hidden rounded-lg bg-slate-100">
              <div
                className="flex h-full min-w-[2%] items-center rounded-lg bg-[#3b82f6] px-2 text-xs font-semibold text-white"
                style={{ width: `${Math.max(widthPct, row.count > 0 ? 8 : 0)}%` }}
              >
                {widthPct >= 18 ? `${row.pct.toFixed(1).replace(".", ",")}%` : null}
              </div>
            </div>
            <span className="text-sm font-semibold text-slate-800 sm:text-right">
              {row.count.toLocaleString("pt-BR")}
              {widthPct < 18 ? (
                <span className="ml-1 font-normal text-slate-500">({row.pct.toFixed(1).replace(".", ",")}%)</span>
              ) : null}
            </span>
          </div>
        );
      })}
    </div>
  );
}
