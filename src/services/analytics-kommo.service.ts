import { getDefaultDateRange, parseISODate, toISODate, type DateRange } from "@/lib/date-range";
import { buildAnalyticsMetrics } from "@/lib/kommo/analytics-metrics";
import { isKommoConfigured, verifyKommoConnection } from "@/lib/kommo/client";
import { isKommoConfiguredForTenant, verifyKommoForTenant } from "@/lib/kommo/tenant-client";
import type { AnalyticsMetrics } from "@/types/analytics-metrics";
import type { DashboardSettings } from "@/types/data-source";
import { getKommoLeadsContext } from "@/services/kommo.service";

const ANALYTICS_CACHE_TTL_MS = 5 * 60 * 1000;
const analyticsCache = new Map<string, { metrics: AnalyticsMetrics; fetchedAt: number }>();

function cacheKey(userId: string, range: DateRange): string {
  return `${userId}:${toISODate(range.from)}:${toISODate(range.to)}`;
}

export async function getAnalyticsMetricsForUserRange(
  userId: string,
  _settings: DashboardSettings,
  range: DateRange,
  options?: { bustCache?: boolean; tenantId?: string; integrationId?: string | null },
): Promise<AnalyticsMetrics> {
  const key = cacheKey(userId, range);
  const cached = analyticsCache.get(key);
  if (!options?.bustCache && cached && Date.now() - cached.fetchedAt < ANALYTICS_CACHE_TTL_MS) {
    return cached.metrics;
  }

  const tenantId = options?.tenantId;
  const integrationId = options?.integrationId;
  const configured = tenantId
    ? await isKommoConfiguredForTenant(tenantId, integrationId)
    : isKommoConfigured();
  if (!configured) {
    throw new Error("Kommo não está configurado");
  }

  const verified = tenantId
    ? await verifyKommoForTenant(tenantId, integrationId)
    : await verifyKommoConnection();
  if (!verified.ok) {
    throw new Error(verified.error ?? "Falha ao conectar com Kommo");
  }

  const { leads, classification, statusMap } = await getKommoLeadsContext(
    Boolean(options?.bustCache),
    range,
    tenantId,
    integrationId,
  );
  const metrics = buildAnalyticsMetrics(leads, range, classification, statusMap);
  analyticsCache.set(key, { metrics, fetchedAt: Date.now() });
  return metrics;
}

export function resolveAnalyticsRange(fromParam: string | null, toParam: string | null): DateRange {
  const defaultRange = getDefaultDateRange();
  const from = parseISODate(fromParam ?? undefined) ?? defaultRange.from;
  const to = parseISODate(toParam ?? undefined) ?? defaultRange.to;
  return { from, to };
}

export function analyticsPeriodPayload(range: DateRange) {
  return { from: toISODate(range.from), to: toISODate(range.to) };
}
