"use client";

import { useCallback, useEffect, useState } from "react";
import { DEFAULT_DATE_RANGE, parseISODate, toISODate, type DateRange } from "@/lib/date-range";
import type { MetricsResponse } from "@/types/metrics-response";

export function useAnalyticsPeriod(initialRange?: DateRange) {
  const [range, setRange] = useState<DateRange>(initialRange ?? DEFAULT_DATE_RANGE);
  const [kommoConfigured, setKommoConfigured] = useState(false);
  const [kommoConnected, setKommoConnected] = useState(false);
  const [kommoError, setKommoError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [periodLabel, setPeriodLabel] = useState("");

  const fetchStatus = useCallback(async (r: DateRange, bustCache = false) => {
    setLoading(true);
    setError(null);
    try {
      const qs = new URLSearchParams({
        from: toISODate(r.from),
        to: toISODate(r.to),
      });
      if (bustCache) qs.set("refresh", "1");
      const res = await fetch(`/api/dashboard/metrics?${qs}`);
      if (!res.ok) throw new Error("Não foi possível verificar status do Kommo.");
      const data = (await res.json()) as MetricsResponse;
      setKommoConfigured(data.kommoConfigured);
      setKommoConnected(Boolean(data.metrics) && !data.error);
      setKommoError(data.error ?? null);
      setRange({
        from: parseISODate(data.period.from) ?? r.from,
        to: parseISODate(data.period.to) ?? r.to,
      });
      const fromLabel = parseISODate(data.period.from)?.toLocaleDateString("pt-BR") ?? "";
      const toLabel = parseISODate(data.period.to)?.toLocaleDateString("pt-BR") ?? "";
      setPeriodLabel(fromLabel && toLabel ? `${fromLabel} — ${toLabel}` : "");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStatus(range);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const applyRange = useCallback(
    (r: DateRange) => {
      setRange(r);
      fetchStatus(r);
    },
    [fetchStatus],
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
      await fetchStatus(range, true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro");
      setLoading(false);
    }
  }, [fetchStatus, range]);

  return {
    range,
    setRange: applyRange,
    loading,
    error,
    kommoConfigured,
    kommoConnected,
    kommoError,
    periodLabel,
    refetch: () => fetchStatus(range),
    refreshKommo,
  };
}
