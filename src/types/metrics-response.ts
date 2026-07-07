import type { DashboardMetrics } from "@/types/dashboard-metrics";

export type MetricsResponse = {
  metrics?: DashboardMetrics;
  period: { from: string; to: string };
  source?: "kommo";
  kommoConfigured: boolean;
  error?: string;
};

export type { DashboardInitialData } from "@/lib/dashboard/initial-metrics";
