"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { DateRange } from "@/lib/date-range";
import { toISODate } from "@/lib/date-range";
import type { DashboardWidget } from "@/types/dashboard-layout";
import type { CustomDataPayload } from "@/types/data-source";
import { getWidgetQueryConfig, isQueryReady } from "@/types/widget-query";

type WidgetDataState = {
  payload: CustomDataPayload | Record<string, unknown> | null;
  loading: boolean;
  error: string | null;
  empty: boolean;
};

export function useWidgetData(widget: DashboardWidget, dateRange: DateRange, dataOwnerId?: string) {
  const [state, setState] = useState<WidgetDataState>({
    payload: null,
    loading: true,
    error: null,
    empty: false,
  });

  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const configKey = JSON.stringify(widget.props?.queryConfig ?? null);
  const queryConfig = useMemo(() => getWidgetQueryConfig(widget), [widget.id, widget.type, configKey]);

  const fetchData = useCallback(async () => {
    if (!isQueryReady(queryConfig, widget.type)) {
      setState({ payload: null, loading: false, error: null, empty: true });
      return;
    }

    setState((prev) => ({ ...prev, loading: true, error: null }));

    try {
      const res = await fetch("/api/analytics/query", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          widgetType: widget.type,
          queryConfig,
          from: toISODate(dateRange.from),
          to: toISODate(dateRange.to),
          ...(dataOwnerId ? { dataOwnerId } : {}),
        }),
      });

      const body = (await res.json()) as { payload?: CustomDataPayload; error?: string; empty?: boolean };

      if (!res.ok && !body.empty) {
        throw new Error(body.error ?? "Falha ao carregar dados");
      }

      if (body.empty || !body.payload) {
        setState({
          payload: null,
          loading: false,
          error: body.error ?? "Nenhuma fonte de dados conectada",
          empty: true,
        });
        return;
      }

      setState({ payload: body.payload, loading: false, error: null, empty: false });
    } catch (err) {
      setState({
        payload: null,
        loading: false,
        error: err instanceof Error ? err.message : "Erro ao carregar",
        empty: true,
      });
    }
  }, [widget.type, queryConfig, dateRange.from, dateRange.to, dataOwnerId]);

  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      void fetchData();
    }, 200);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [fetchData]);

  return { ...state, refetch: fetchData, queryConfig };
}
