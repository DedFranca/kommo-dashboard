"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { getDefaultDateRange, parseISODate, toISODate, type DateRange } from "@/lib/date-range";
import type { DashboardMetrics } from "@/types/dashboard-metrics";
import type { DashboardInitialData, MetricsResponse } from "@/types/metrics-response";
import { EMPTY_DASHBOARD_FILTERS, type DashboardFilters } from "@/types/dashboard-filters";

function filtersToQuery(filters: DashboardFilters): URLSearchParams {
  const qs = new URLSearchParams();
  if (filters.pipelineIds.length) qs.set("pipeline", filters.pipelineIds.join(","));
  if (filters.responsibleIds.length) qs.set("responsible", filters.responsibleIds.join(","));
  if (filters.statusIds.length) qs.set("status", filters.statusIds.join(","));
  return qs;
}

type Options = {
  initial?: DashboardInitialData;
};

export function useDashboardMetrics(initialRange?: DateRange, options?: Options) {
  const initial = options?.initial;
  const initialPeriod = initial?.period;
  const resolvedInitialRange: DateRange = initialPeriod
    ? {
        from: parseISODate(initialPeriod.from) ?? initialRange?.from ?? getDefaultDateRange().from,
        to: parseISODate(initialPeriod.to) ?? initialRange?.to ?? getDefaultDateRange().to,
      }
    : (initialRange ?? getDefaultDateRange());

  const [range, setRange] = useState<DateRange>(resolvedInitialRange);
  const [filters, setFilters] = useState<DashboardFilters>(EMPTY_DASHBOARD_FILTERS);
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(initial?.metrics ?? null);
  const [kommoConfigured, setKommoConfigured] = useState(initial?.kommoConfigured ?? false);
  const [loading, setLoading] = useState(!initial?.metrics);
  const [error, setError] = useState<string | null>(null);
  const didInitialFetch = useRef(false);

  const fetchMetrics = useCallback(async (r: DateRange, f: DashboardFilters, bustCache = false, keepVisible = false) => {
    if (!keepVisible) setLoading(true);
    setError(null);
    try {
      const qs = new URLSearchParams({
        from: toISODate(r.from),
        to: toISODate(r.to),
      });
      const filterQs = filtersToQuery(f);
      filterQs.forEach((value, key) => qs.set(key, value));
      if (bustCache) qs.set("refresh", "1");

      const res = await fetch(`/api/dashboard/metrics?${qs}`);
      const data = (await res.json()) as MetricsResponse;

      setKommoConfigured(data.kommoConfigured);

      if (!res.ok || !data.metrics) {
        if (!keepVisible) {
          setMetrics(null);
        }
        setError(data.error ?? "Não foi possível carregar métricas do Kommo.");
        return;
      }

      setMetrics(data.metrics);
      setRange({
        from: parseISODate(data.period.from) ?? r.from,
        to: parseISODate(data.period.to) ?? r.to,
      });
    } catch (e) {
      if (!keepVisible) {
        setMetrics(null);
      }
      setError(e instanceof Error ? e.message : "Erro ao carregar métricas.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (didInitialFetch.current) return;
    didInitialFetch.current = true;

    if (initial?.metrics) {
      setLoading(false);
      if (initial.revalidate) {
        void fetchMetrics(resolvedInitialRange, filters, false, true);
      }
      return;
    }

    void fetchMetrics(resolvedInitialRange, filters);
  }, [initial?.metrics, initial?.revalidate, fetchMetrics, filters, resolvedInitialRange]);

  const applyRange = useCallback(
    (r: DateRange) => {
      setRange(r);
      fetchMetrics(r, filters, false, metrics !== null);
    },
    [fetchMetrics, filters, metrics],
  );

  const applyFilters = useCallback(
    (f: DashboardFilters) => {
      setFilters(f);
      fetchMetrics(range, f);
    },
    [fetchMetrics, range],
  );

  const refreshKommo = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/kommo/refresh-metrics", { method: "POST" });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(body.error ?? "Falha ao atualizar dados Kommo.");
      }
      await fetchMetrics(range, filters, true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro");
      setLoading(false);
    }
  }, [fetchMetrics, range, filters]);

  return {
    metrics,
    range,
    filters,
    setRange: applyRange,
    setFilters: applyFilters,
    loading,
    error,
    kommoConfigured,
    refetch: () => fetchMetrics(range, filters),
    refreshKommo,
  };
}
