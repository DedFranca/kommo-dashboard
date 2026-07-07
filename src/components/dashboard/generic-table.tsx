"use client";

import { Card } from "@/components/ui/card";
import type { TableColumn } from "@/types/data-source";

type Props = {
  title: string;
  columns: TableColumn[];
  rows: Record<string, string | number | null>[];
};

function formatCell(value: string | number | null, numeric?: boolean): string {
  if (value === null || value === undefined || value === "") return "—";
  if (numeric && typeof value === "number") {
    return value.toLocaleString("pt-BR", { maximumFractionDigits: 2 });
  }
  return String(value);
}

export function GenericTable({ title, columns, rows }: Props) {
  return (
    <Card className="flex h-full min-h-0 flex-col overflow-hidden p-0">
      <div className="border-b border-border bg-slate-50 px-4 py-3 dark:bg-slate-900/80">
        <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-100">{title}</h3>
      </div>
      <div className="min-h-0 flex-1 overflow-auto">
        {columns.length === 0 || rows.length === 0 ? (
          <div className="flex h-full items-center justify-center p-4 text-xs text-slate-400">
            Selecione ao menos uma coluna e uma métrica.
          </div>
        ) : (
          <table className="w-full border-collapse text-left text-sm">
            <thead className="sticky top-0 bg-slate-100 text-xs text-slate-600 dark:bg-slate-800 dark:text-slate-300">
              <tr>
                <th className="w-10 px-3 py-2 font-semibold">#</th>
                {columns.map((col) => (
                  <th
                    key={col.key}
                    className={`px-3 py-2 font-semibold ${col.numeric ? "text-right" : ""}`}
                  >
                    {col.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {rows.map((row, idx) => (
                <tr key={idx} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50">
                  <td className="px-3 py-2 text-slate-500">{idx + 1}.</td>
                  {columns.map((col) => (
                    <td
                      key={col.key}
                      className={`px-3 py-2 ${
                        col.numeric
                          ? "text-right tabular-nums font-semibold text-indigo-700 dark:text-indigo-300"
                          : "max-w-[220px] truncate text-slate-700 dark:text-slate-200"
                      }`}
                    >
                      {formatCell(row[col.key], col.numeric)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </Card>
  );
}
