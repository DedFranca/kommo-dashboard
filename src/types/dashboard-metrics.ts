/** Dados agregados do dashboard executivo via API Kommo. */

import type { DashboardFilterOptions } from "@/types/dashboard-filters";

export type TimeSeriesPoint = {
  label: string;
  value: number;
  date?: string;
};

export type RankingRow = {
  rank: number;
  primary: string;
  secondary: string | null;
  value: number;
};

export type FunnelStage = {
  stage: string;
  count: number;
  pct: number;
};

export type ResponsiblePerformanceRow = {
  name: string;
  leads: number;
  won: number;
  conversionRate: number;
};

export type HeatmapCell = {
  dayOfWeek: number;
  hour: number;
  value: number;
};

export type KpiDelta = {
  value: number;
  previousValue: number;
  changePct: number | null;
};

export type ClosingTimeStats = {
  avg: number;
  median: number;
  min: number;
  max: number;
  histogram: TimeSeriesPoint[];
};

export type DashboardMetrics = {
  periodLabel: string;
  previousPeriodLabel: string;
  filterOptions: DashboardFilterOptions;

  totalLeads: number;
  newLeads: number;
  wonLeads: number;
  lostLeads: number;
  inProgressLeads: number;
  conversionRate: number;
  avgClosingDays: number;
  /** Soma do valor (price/sale_amount) dos negócios ganhos fechados no período */
  monthlyRevenue: number;
  /** Sparkline KPI — últimos 6 meses, agrupado por mês */
  revenueOverTime: TimeSeriesPoint[];

  kpiDeltas: {
    totalLeads: KpiDelta;
    newLeads: KpiDelta;
    wonLeads: KpiDelta;
    lostLeads: KpiDelta;
    inProgressLeads: KpiDelta;
    conversionRate: KpiDelta;
    monthlyRevenue: KpiDelta;
  };

  /** Funil por etapas de status */
  statusFunnel: FunnelStage[];
  /** Barras horizontais por status */
  leadsByStatus: RankingRow[];
  /** Kanban / pipeline em tempo real */
  kanbanSummary: FunnelStage[];

  /** Sparkline KPI — últimos 6 meses, agrupado por mês */
  leadsOverTime: TimeSeriesPoint[];
  /** Sparkline KPI — últimos 6 meses, agrupado por mês */
  salesOverTime: TimeSeriesPoint[];
  /** Gráfico Leads x Consultas — semanas do mês atual */
  chartLeadsWeek: TimeSeriesPoint[];
  chartSalesWeek: TimeSeriesPoint[];
  /** Gráfico Leads x Consultas — últimos 6 meses */
  chartLeadsMonth: TimeSeriesPoint[];
  chartSalesMonth: TimeSeriesPoint[];
  responsiblePerformance: ResponsiblePerformanceRow[];
  pipelineDistribution: RankingRow[];
  leadEntryHeatmap: HeatmapCell[];
  closingTime: ClosingTimeStats;

  /** Melhor mês histórico (todos os leads por data de criação). */
  bestMonthLeadsAllTime: { label: string; value: number } | null;
  /** Melhor mês histórico (consultas ganhas por data de fechamento). */
  bestMonthConsultasAllTime: { label: string; value: number } | null;

  /** @deprecated alias */
  conversionFunnel: FunnelStage[];
};

/** @deprecated — coorte legada */
export type CohortRow = {
  weekLabel: string;
  date?: string;
  leads: number;
  conversions: number;
  pctWeek0: number;
  pctWeek1: number;
  pctWeek2: number;
  pctWeek3: number;
  pctMonth0: number;
  pctMonth1: number;
  conversionRate: number;
};

/** Métricas usadas pelos presets de widgets na aba Analytics (formato V1). */
export type WidgetPresetMetrics = {
  periodLabel: string;
  newLeads: number;
  conversionRate: number;
  appointments: number;
  cohort: CohortRow[];
  cohortTotal?: CohortRow;
  leadsWonOverTime: TimeSeriesPoint[];
  closedByLocation: RankingRow[];
  closedByOrigin: RankingRow[];
};

/** @deprecated */
export type MockDashboardMetrics = DashboardMetrics;
