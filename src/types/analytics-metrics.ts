import type { ClosingTimeStats, FunnelStage } from "@/types/dashboard-metrics";

export type CohortRow = {
  month: string;
  monthKey: string;
  cohortSize: number;
  rates: (number | null)[];
};

export type LeadOriginRow = {
  origin: string;
  count: number;
  pct: number;
};

export type AnalyticsMetrics = {
  periodLabel: string;
  statusFunnel: FunnelStage[];
  closingTime: ClosingTimeStats;
  cohort: CohortRow[];
  cohortColumnAverages: (number | null)[];
  leadOrigins: LeadOriginRow[];
};

export type AnalyticsMetricsResponse = {
  metrics?: AnalyticsMetrics;
  period: { from: string; to: string };
  kommoConfigured: boolean;
  error?: string;
};
