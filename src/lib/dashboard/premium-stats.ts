import type { DashboardMetrics, TimeSeriesPoint } from "@/types/dashboard-metrics";

export type ComparativePoint = {
  label: string;
  date?: string;
  leads: number;
  consultas: number;
};

export type BottomStats = {
  avgLeadsPerMonth: number;
  avgConsultasPerMonth: number;
  bestMonthLeads: { label: string; value: number } | null;
  bestMonthConsultas: { label: string; value: number } | null;
};

function indexSeries(series: TimeSeriesPoint[]): Map<string, TimeSeriesPoint> {
  const map = new Map<string, TimeSeriesPoint>();
  for (const point of series) {
    const key = point.date ?? point.label;
    map.set(key, point);
  }
  return map;
}

/** Mescla séries de leads e consultas fechadas pelo mesmo eixo temporal. */
export function buildComparativeSeries(
  leadsOverTime: TimeSeriesPoint[],
  salesOverTime: TimeSeriesPoint[],
): ComparativePoint[] {
  const leadsMap = indexSeries(leadsOverTime);
  const salesMap = indexSeries(salesOverTime);
  const keys = new Set([...leadsMap.keys(), ...salesMap.keys()]);

  return Array.from(keys)
    .map((key) => {
      const lead = leadsMap.get(key);
      const sale = salesMap.get(key);
      return {
        label: lead?.label ?? sale?.label ?? key,
        date: lead?.date ?? sale?.date ?? key,
        leads: lead?.value ?? 0,
        consultas: sale?.value ?? 0,
      };
    })
    .sort((a, b) => ((a.date ?? a.label) < (b.date ?? b.label) ? -1 : 1));
}

function bestPoint(series: TimeSeriesPoint[]): { label: string; value: number } | null {
  const withData = series.filter((p) => p.value > 0);
  if (!withData.length) return null;
  const best = withData.reduce((acc, cur) => (cur.value > acc.value ? cur : acc));
  return { label: best.label, value: best.value };
}

export function computeBottomStats(
  leadsOverTime: TimeSeriesPoint[],
  salesOverTime: TimeSeriesPoint[],
  options?: {
    bestMonthLeads?: { label: string; value: number } | null;
    bestMonthConsultas?: { label: string; value: number } | null;
  },
): BottomStats {
  const leadValues = leadsOverTime.map((p) => p.value);
  const saleValues = salesOverTime.map((p) => p.value);
  const avgLeads =
    leadValues.length > 0 ? Math.round(leadValues.reduce((a, b) => a + b, 0) / leadValues.length) : 0;
  const avgConsultas =
    saleValues.length > 0 ? Math.round(saleValues.reduce((a, b) => a + b, 0) / saleValues.length) : 0;

  return {
    avgLeadsPerMonth: avgLeads,
    avgConsultasPerMonth: avgConsultas,
    bestMonthLeads: options?.bestMonthLeads ?? bestPoint(leadsOverTime),
    bestMonthConsultas: options?.bestMonthConsultas ?? bestPoint(salesOverTime),
  };
}

export function formatCurrencyBRL(value: number): string {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export function formatDelta(changePct: number | null): string {
  if (changePct === null) return "—";
  const sign = changePct > 0 ? "+" : "";
  return `${sign}${changePct.toFixed(1).replace(".", ",")}%`;
}
