"use client";

import { useEffect, useState } from "react";
import type { DateRange } from "@/lib/date-range";
import { toISODate } from "@/lib/date-range";
import type { DashboardWidget } from "@/types/dashboard-layout";
import type { CustomDataPayload } from "@/types/data-source";
import type { WidgetQueryConfig } from "@/types/widget-query";
import { isQueryReady } from "@/types/widget-query";
import { EmptyDataState } from "./empty-data-state";
import { WidgetPreviewRenderer } from "./widget-preview-renderer";

type Props = {
  widget: DashboardWidget;
  queryConfig: WidgetQueryConfig;
  dateRange: DateRange;
};

export function WidgetPreview({ widget, queryConfig, dateRange }: Props) {
  const [payload, setPayload] = useState<CustomDataPayload | Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [empty, setEmpty] = useState(false);

  useEffect(() => {
    if (!isQueryReady(queryConfig, widget.type)) {
      setEmpty(true);
      setPayload(null);
      setError(null);
      return;
    }

    const timer = setTimeout(async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch("/api/analytics/query", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            widgetType: widget.type,
            queryConfig,
            from: toISODate(dateRange.from),
            to: toISODate(dateRange.to),
          }),
        });
        const body = (await res.json()) as { payload?: CustomDataPayload; error?: string; empty?: boolean };
        if (body.empty || !body.payload) {
          setEmpty(true);
          setPayload(null);
          setError(body.error ?? null);
          return;
        }
        setPayload(body.payload);
        setEmpty(false);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Erro no preview");
        setEmpty(true);
      } finally {
        setLoading(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [widget.type, queryConfig, dateRange.from, dateRange.to]);

  if (!isQueryReady(queryConfig, widget.type)) {
    return <EmptyDataState compact message="Configure a fonte e as métricas para ver o preview" />;
  }

  if (loading) {
    return (
      <div className="flex h-32 items-center justify-center rounded-lg border border-dashed border-border bg-slate-50 dark:bg-slate-900/50">
        <span className="text-[10px] text-slate-400">Carregando preview…</span>
      </div>
    );
  }

  if (empty || !payload) {
    return <EmptyDataState compact message={error ?? "Nenhum dado disponível"} />;
  }

  return (
    <div className="h-40 overflow-hidden rounded-lg border border-border bg-white dark:bg-slate-950">
      <WidgetPreviewRenderer widget={widget} payload={payload} />
    </div>
  );
}
