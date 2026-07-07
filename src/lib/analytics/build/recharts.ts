import type { CustomDataPayload } from "@/types/data-source";
import type { QuerySpec, RawTable } from "@/types/analytics";
import { aggregateTable } from "@/lib/analytics/aggregate/group-by";

function firstMetricAs(spec: QuerySpec): string {
  const m = spec.metrics?.[0];
  if (!m) return "count";
  return m.as ?? (m.op === "count" ? "count" : `${m.op}_${m.column ?? "v"}`);
}

export function buildPayloadForWidget(params: {
  widgetType: "kpi" | "lineChart" | "barChart" | "areaChart" | "pieChart" | "rankingTable";
  table: RawTable;
  spec: QuerySpec;
  // for time series, optionally pick a label column
  labelColumn?: string;
}): CustomDataPayload {
  const metricKey = firstMetricAs(params.spec);
  const rows = aggregateTable(params.table, params.spec);

  if (params.widgetType === "kpi") {
    const total = rows.reduce((a, r) => a + Number(r[metricKey] ?? 0), 0);
    return { value: total };
  }

  if (params.widgetType === "rankingTable" || params.widgetType === "pieChart") {
    const dim = params.spec.dimensions[0];
    return {
      rows: rows.map((r) => ({
        primary: String(r[dim] ?? "—"),
        secondary: null,
        value: Number(r[metricKey] ?? 0),
      })),
      primaryLabel: dim,
      secondaryLabel: "—",
    };
  }

  // line/bar/area: expect 1 dimension as label, 1 metric
  const dim = params.spec.dimensions[0];
  return {
    data: rows.map((r) => ({
      label: String(r[params.labelColumn ?? dim] ?? ""),
      value: Number(r[metricKey] ?? 0),
      date: typeof r[dim] === "string" ? String(r[dim]) : undefined,
    })),
  };
}

