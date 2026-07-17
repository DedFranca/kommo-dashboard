import type { DashboardLayoutState, WidgetType } from "@/types/dashboard-layout";
import type { DashboardMetrics, WidgetPresetMetrics } from "@/types/dashboard-metrics";
import type { AnalyticsPreset } from "@/types/analytics-presets";

/** Chaves dos datasets embutidos (API Kommo). */
export type BuiltinDataKey =
  | "totalLeads"
  | "newLeads"
  | "conversionRate"
  | "wonLeads"
  | "lostLeads"
  | "inProgressLeads"
  | "avgClosingDays"
  | "conversionFunnel"
  | "leadsOverTime"
  | "salesOverTime"
  | "responsiblePerformance"
  | "pipelineDistribution"
  | "leadEntryHeatmap";

export type DataBinding =
  | { kind: "builtin"; key: BuiltinDataKey }
  | { kind: "custom"; sourceId: string }
  | { kind: "dataset"; datasetId: string; xKey: string; yKey: string };

export type DashboardDataset = {
  id: string;
  name: string;
  fileName?: string;
  columns: string[];
  rows: Record<string, string | null>[];
  createdAt: string;
};

export type KpiDelta = {
  /** Variação percentual vs. período anterior (null quando não calculável). */
  pct: number | null;
  previous: number;
  direction: "up" | "down" | "flat";
  label: string;
};

export type KpiPayload = {
  value: number | string;
  hint?: string;
  format?: "percent" | "number" | "currency";
  delta?: KpiDelta;
};

export type LineChartPayload = { data: import("@/types/dashboard-metrics").TimeSeriesPoint[]; subtitle?: string };

export type RankingPayload = {
  rows: Omit<import("@/types/dashboard-metrics").RankingRow, "rank">[];
  primaryLabel?: string;
  secondaryLabel?: string;
};

export type TableColumn = { key: string; label: string; numeric?: boolean };

/** Tabela genérica multi-coluna (dimensões + métricas escolhidas pelo usuário). */
export type TablePayload = {
  columns: TableColumn[];
  rows: Record<string, string | number | null>[];
};

export type CohortPayload = { rows: import("@/types/dashboard-metrics").CohortRow[]; total?: import("@/types/dashboard-metrics").CohortRow };

export type CustomDataPayload = KpiPayload | LineChartPayload | RankingPayload | TablePayload | CohortPayload;

export type CustomDataSource = {
  id: string;
  name: string;
  widgetType: WidgetType;
  fileName?: string;
  payload: CustomDataPayload;
  createdAt: string;
};

export type DashboardSettings = {
  periodFrom?: string;
  periodTo?: string;
  /** Layout de widgets personalizáveis na aba Analytics (legado — fonte única migrada para presets) */
  analyticsLayout?: DashboardLayoutState;
  /** Layouts nomeados e salvos da aba Analytics (CRUD completo do usuário) */
  analyticsPresets?: AnalyticsPreset[];
  analyticsActivePresetId?: string;
  datasets?: DashboardDataset[];
  kommoMetricsCache?: DashboardMetrics;
  kommoMetricsCacheUpdatedAt?: string;
  kommoMetricsCachePeriodFrom?: string;
  kommoMetricsCachePeriodTo?: string;
  kommoMetricsCacheGrouping?: string;
  /** Integração Kommo usada ao gravar o cache (invalida ao trocar conta). */
  kommoMetricsCacheIntegrationId?: string | null;
  widgetPresetCache?: WidgetPresetMetrics;
  widgetPresetCacheUpdatedAt?: string;
  widgetPresetCachePeriodFrom?: string;
  widgetPresetCachePeriodTo?: string;
};

export const BUILTIN_DATA_OPTIONS: { key: BuiltinDataKey; label: string; widgetTypes: WidgetType[] }[] = [
  { key: "totalLeads", label: "Total de leads (conta Kommo)", widgetTypes: ["kpi"] },
  { key: "newLeads", label: "Leads criados no período", widgetTypes: ["kpi"] },
  { key: "conversionRate", label: "Taxa de conversão", widgetTypes: ["kpi"] },
  { key: "avgClosingDays", label: "Tempo médio de fechamento", widgetTypes: ["kpi"] },
  { key: "conversionFunnel", label: "Funil de conversão", widgetTypes: ["funnelChart"] },
  { key: "leadsOverTime", label: "Leads por período", widgetTypes: ["lineChart", "barChart", "areaChart"] },
  { key: "salesOverTime", label: "Vendas por período", widgetTypes: ["lineChart", "barChart", "areaChart"] },
  { key: "responsiblePerformance", label: "Performance dos responsáveis", widgetTypes: ["performanceChart"] },
  { key: "pipelineDistribution", label: "Distribuição por pipeline", widgetTypes: ["pieChart", "barChart"] },
  { key: "leadEntryHeatmap", label: "Heatmap de entrada dos leads", widgetTypes: ["heatmapChart"] },
];

export const WIDGET_TYPE_LABELS: Record<WidgetType, string> = {
  kpi: "Indicador (KPI)",
  lineChart: "Gráfico de linha",
  barChart: "Gráfico de barras",
  areaChart: "Gráfico de área",
  pieChart: "Gráfico de pizza",
  rankingTable: "Tabela ranking",
  cohortTable: "Tabela de coorte",
  cohortChart: "Gráfico de coorte",
  funnelChart: "Funil de conversão",
  heatmapChart: "Heatmap",
  performanceChart: "Performance por responsável",
};
