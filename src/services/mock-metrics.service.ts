import { MOCK_DASHBOARD_METRICS } from "@/data/mock-dashboard";
import type { WidgetPresetMetrics } from "@/types/dashboard-metrics";

/** Retorna métricas fictícias para teste de widgets (sem chamar Kommo). */
export function getMockDashboardMetrics(): WidgetPresetMetrics {
  return structuredClone(MOCK_DASHBOARD_METRICS);
}
