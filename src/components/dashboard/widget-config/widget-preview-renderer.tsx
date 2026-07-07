"use client";

import { GenericAreaChart } from "@/components/dashboard/generic-area-chart";
import { GenericBarChart } from "@/components/dashboard/generic-bar-chart";
import { GenericPieChart } from "@/components/dashboard/generic-pie-chart";
import { GenericTable } from "@/components/dashboard/generic-table";
import { KpiMetricCard } from "@/components/dashboard/kpi-metric-card";
import { LeadsWonChart } from "@/components/dashboard/leads-won-chart";
import { RankingTable } from "@/components/dashboard/ranking-table";
import type { DashboardWidget } from "@/types/dashboard-layout";
import type { CustomDataPayload, KpiDelta, TableColumn } from "@/types/data-source";
import type { CohortRow, RankingRow } from "@/types/dashboard-metrics";

function formatKpiValue(value: number | string, format?: string): string {
  if (typeof value !== "number") return String(value);
  if (format === "percent") return `${value.toFixed(1)}%`;
  if (format === "currency")
    return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  return value.toLocaleString("pt-BR", { maximumFractionDigits: 2 });
}

type Props = {
  widget: DashboardWidget;
  payload: CustomDataPayload | Record<string, unknown>;
};

function withRank(rows: Omit<RankingRow, "rank">[]): RankingRow[] {
  return rows.map((r, i) => ({ ...r, rank: i + 1 }));
}

export function WidgetPreviewRenderer({ widget, payload }: Props) {
  const p = payload as Record<string, unknown>;

  if ("cohort" in p && p.cohort) {
    const c = p.cohort as { rows: CohortRow[]; total?: CohortRow };
    return (
      <div className="flex h-full items-center justify-center p-2 text-[10px] text-slate-500">
        Coorte — {c.rows.length} períodos
      </div>
    );
  }

  if ("columns" in p && Array.isArray(p.columns)) {
    const t = p as { columns: TableColumn[]; rows: Record<string, string | number | null>[] };
    return <GenericTable title={widget.title} columns={t.columns} rows={t.rows} />;
  }

  if ("value" in p) {
    const kpi = p as { value: number | string; format?: string; delta?: KpiDelta };
    return (
      <KpiMetricCard
        title={widget.title}
        value={formatKpiValue(kpi.value, kpi.format)}
        accent="primary"
        delta={kpi.delta}
      />
    );
  }

  if ("data" in p && Array.isArray(p.data)) {
    const line = p as { data: { label: string; value: number }[]; subtitle?: string };
    if (widget.type === "barChart") {
      return <GenericBarChart title={widget.title} subtitle={line.subtitle} data={line.data} dataLabel="Valor" />;
    }
    if (widget.type === "areaChart") {
      return <GenericAreaChart title={widget.title} subtitle={line.subtitle} data={line.data} dataLabel="Valor" />;
    }
    return <LeadsWonChart title={widget.title} subtitle={line.subtitle} data={line.data} />;
  }

  if ("rows" in p && Array.isArray(p.rows)) {
    const r = p as { rows: Omit<RankingRow, "rank">[]; primaryLabel?: string; secondaryLabel?: string };
    if (widget.type === "pieChart") {
      return <GenericPieChart title={widget.title} rows={r.rows} />;
    }
    return (
      <RankingTable
        title={widget.title}
        rows={withRank(r.rows)}
        primaryLabel={r.primaryLabel ?? "Item"}
        secondaryLabel={r.secondaryLabel ?? "—"}
      />
    );
  }

  return null;
}

/** Renderiza payload do analytics engine no canvas principal. */
export function renderWidgetPayload(
  widget: DashboardWidget,
  payload: CustomDataPayload | Record<string, unknown>,
) {
  return <WidgetPreviewRenderer widget={widget} payload={payload} />;
}
