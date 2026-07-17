import { getDefaultDateRange, parseISODate, toISODate } from "@/lib/date-range";
import { diagnoseKommoForSession } from "@/lib/kommo/session-client";
import { getDashboardExtras } from "@/services/data-source.service";
import { readStoredMetricsCache } from "@/services/kommo.service";
import type { AuthSessionPayload } from "@/types/tenant";
import type { DashboardMetrics } from "@/types/dashboard-metrics";

export type DashboardInitialData = {
  metrics: DashboardMetrics | null;
  period: { from: string; to: string };
  kommoConfigured: boolean;
  /** Motivo quando Kommo não está utilizável (sem vínculo / token ilegível). */
  kommoError?: string | null;
  /** Cache existe mas passou do TTL — cliente deve revalidar em background. */
  revalidate: boolean;
};

function isMetricCacheFresh(updatedAt?: string): boolean {
  if (!updatedAt) return false;
  const date = new Date(updatedAt);
  if (Number.isNaN(date.getTime())) return false;
  const ttlMinutes = Number(process.env.KOMMO_METRICS_CACHE_TTL_MINUTES ?? "20");
  const ageMinutes = (Date.now() - date.getTime()) / 1000 / 60;
  return ageMinutes < Math.max(5, ttlMinutes);
}

/** Carrega métricas do cache persistido no servidor (sem chamar Kommo). */
export async function loadDashboardInitialMetrics(session: AuthSessionPayload): Promise<DashboardInitialData> {
  const diagnosis = await diagnoseKommoForSession(session);
  const { settings } = await getDashboardExtras(session.userId);
  const defaultRange = getDefaultDateRange();

  const from =
    parseISODate(settings.kommoMetricsCachePeriodFrom ?? settings.periodFrom ?? undefined) ?? defaultRange.from;
  const to = parseISODate(settings.kommoMetricsCachePeriodTo ?? settings.periodTo ?? undefined) ?? defaultRange.to;
  const period = { from: toISODate(from), to: toISODate(to) };

  if (!diagnosis.ok) {
    return {
      metrics: null,
      period,
      kommoConfigured: false,
      kommoError: diagnosis.error,
      revalidate: false,
    };
  }

  const cachedIntegrationId = settings.kommoMetricsCacheIntegrationId ?? "";
  const cacheMatchesIntegration = cachedIntegrationId === (diagnosis.integrationId ?? "");
  const cached = cacheMatchesIntegration ? readStoredMetricsCache(settings, { from, to }) : null;
  const fresh = cached ? isMetricCacheFresh(settings.kommoMetricsCacheUpdatedAt) : false;

  return {
    metrics: cached,
    period,
    kommoConfigured: true,
    kommoError: null,
    revalidate: Boolean(cached && !fresh),
  };
}
