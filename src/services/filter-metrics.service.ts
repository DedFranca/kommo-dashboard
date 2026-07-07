import { formatRangeLabel, isDateInRange, type DateRange } from "@/lib/date-range";
import type { WidgetPresetMetrics } from "@/types/dashboard-metrics";

function sumCohort(rows: WidgetPresetMetrics["cohort"]) {
  const leads = rows.reduce((a, r) => a + r.leads, 0);
  const conversions = rows.reduce((a, r) => a + r.conversions, 0);
  const rate = leads > 0 ? (conversions / leads) * 100 : 0;
  return {
    weekLabel: "Total do período",
    leads,
    conversions,
    pctWeek0: rate * 0.7,
    pctWeek1: rate * 0.85,
    pctWeek2: rate * 0.92,
    pctWeek3: rate * 0.96,
    pctMonth0: rate,
    pctMonth1: rate,
    conversionRate: rate,
  };
}

/** Filtra métricas mock pelo intervalo de datas (simula consulta por período). */
export function filterMetricsByDateRange(base: WidgetPresetMetrics, range: DateRange): WidgetPresetMetrics {
  const cohort = base.cohort.filter((r) => isDateInRange(r.date, range.from, range.to));
  const leadsWonOverTime = base.leadsWonOverTime.filter((p) => isDateInRange(p.date, range.from, range.to));

  const cohortLeads = cohort.reduce((a, r) => a + r.leads, 0);
  const cohortConv = cohort.reduce((a, r) => a + r.conversions, 0);
  const seriesSum = leadsWonOverTime.reduce((a, p) => a + p.value, 0);

  const factor = cohort.length / Math.max(base.cohort.length, 1);
  const newLeads = Math.round(base.newLeads * factor);
  const appointments = Math.max(cohortConv, Math.round(base.appointments * factor));
  const conversionRate =
    cohort.length > 0
      ? cohort.reduce((a, r) => a + r.conversionRate, 0) / cohort.length
      : seriesSum > 0
        ? (seriesSum / Math.max(newLeads, 1)) * 100
        : base.conversionRate * factor;

  return {
    periodLabel: formatRangeLabel(range.from, range.to),
    newLeads,
    conversionRate: Math.min(100, Math.round(conversionRate * 100) / 100),
    appointments,
    cohort: cohort.length ? cohort : base.cohort.slice(0, 2),
    cohortTotal: cohort.length ? sumCohort(cohort) : base.cohortTotal,
    leadsWonOverTime: leadsWonOverTime.length ? leadsWonOverTime : base.leadsWonOverTime.slice(0, 3),
    closedByLocation: base.closedByLocation.map((r) => ({
      ...r,
      value: Math.max(0, Math.round(r.value * factor)),
    })),
    closedByOrigin: base.closedByOrigin.map((r) => ({
      ...r,
      value: Math.max(0, Math.round(r.value * factor)),
    })),
  };
}
