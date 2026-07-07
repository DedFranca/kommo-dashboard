"use client";

import { useCallback, useEffect, useState } from "react";
import { getLastSixMonthsRange, parseISODate, toISODate, type DateRange } from "@/lib/date-range";
import type { AnalyticsMetrics } from "@/types/analytics-metrics";
import type { AnalyticsMetricsResponse } from "@/types/analytics-metrics";

export function useAnalyticsMetrics(initialRange?: DateRange) {
  const [range, setRange] = useState<DateRange>(initialRange ?? getLastSixMonthsRange());
  const [metrics, setMetrics] = useState<AnalyticsMetrics | null>(null);
  const [kommoConfigured, setKommoConfigured] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchMetrics = useCallback(async (r: DateRange, bustCache = false, keepVisible = false) => {
    if (!keepVisible) setLoading(true);
    setError(null);
    try {
      const qs = new URLSearchParams({
        from: toISODate(r.from),
        to: toISODate(r.to),
      });
      if (bustCache) qs.set("refresh", "1");

      const res = await fetch(`/api/analytics/metrics?${qs}`);
      const data = (await res.json()) as AnalyticsMetricsResponse;

      setKommoConfigured(data.kommoConfigured);

      if (!res.ok || !data.metrics) {
        setMetrics(null);
        setError(data.error ?? "Não foi possível carregar métricas de analytics.");
        return;
      }

      setMetrics(data.metrics);
      setRange({
        from: parseISODate(data.period.from) ?? r.from,
        to: parseISODate(data.period.to) ?? r.to,
      });
    } catch (e) {
      setMetrics(null);
      setError(e instanceof Error ? e.message : "Erro ao carregar analytics.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMetrics(range);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const applyRange = useCallback(
    (r: DateRange) => {
      setRange(r);
      fetchMetrics(r, false, metrics !== null);
    },
    [fetchMetrics, metrics],
  );

  return {
    metrics,
    range,
    setRange: applyRange,
    loading,
    error,
    kommoConfigured,
    refetch: () => fetchMetrics(range, true),
  };
}
