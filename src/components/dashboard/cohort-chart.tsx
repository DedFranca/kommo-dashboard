"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import type { CohortRow } from "@/types/dashboard-metrics";

type Props = {
  title: string;
  rows: CohortRow[];
  total?: CohortRow;
};

export function CohortChart({ title, rows, total }: Props) {
  // Transform cohort data for bar chart
  const chartData = rows.map((row) => ({
    week: row.weekLabel,
    leads: row.leads,
    conversions: row.conversions,
    rate: row.conversionRate,
  }));

  return (
    <div className="flex flex-col gap-3 rounded-lg border border-border bg-white p-4 dark:bg-slate-950">
      <div>
        <h3 className="font-semibold text-slate-900 dark:text-white">{title}</h3>
        {total && (
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            Total: {total.leads} leads | {total.conversions} conversões ({total.conversionRate?.toFixed(2) || 0}%)
          </p>
        )}
      </div>

      <div className="h-64 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} margin={{ top: 20, right: 30, left: 0, bottom: 60 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(100, 116, 139, 0.1)" />
            <XAxis
              dataKey="week"
              angle={-45}
              textAnchor="end"
              height={80}
              tick={{ fontSize: 12 }}
            />
            <YAxis tick={{ fontSize: 12 }} />
            <Tooltip
              contentStyle={{
                backgroundColor: "#1e293b",
                border: "1px solid #475569",
                borderRadius: "0.5rem",
              }}
              labelStyle={{ color: "#fff" }}
              formatter={(value: unknown, name: string) => [
                typeof value === "number" ? value.toLocaleString("pt-BR") : String(value ?? ""),
                name,
              ]}
            />
            <Legend />
            <Bar dataKey="leads" fill="#3b82f6" name="Leads" />
            <Bar dataKey="conversions" fill="#10b981" name="Conversões" />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
