"use client";

import { useEffect, useState } from "react";
import type { DateRange } from "@/lib/date-range";
import { toISODate } from "@/lib/date-range";
import type { WidgetDataSource } from "@/types/widget-query";

export function useFieldValues(
  source: WidgetDataSource | null,
  field: string,
  dateRange: DateRange,
  dataOwnerId?: string,
) {
  const [values, setValues] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!source || !field) {
      setValues([]);
      return;
    }

    const ctrl = new AbortController();
    setLoading(true);

    void fetch("/api/analytics/field-values", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        source,
        field,
        from: toISODate(dateRange.from),
        to: toISODate(dateRange.to),
        ...(dataOwnerId ? { dataOwnerId } : {}),
      }),
      signal: ctrl.signal,
    })
      .then((res) => (res.ok ? res.json() : null))
      .then((data: { values?: string[] } | null) => {
        if (!ctrl.signal.aborted) setValues(data?.values ?? []);
      })
      .catch(() => {
        if (!ctrl.signal.aborted) setValues([]);
      })
      .finally(() => {
        if (!ctrl.signal.aborted) setLoading(false);
      });

    return () => ctrl.abort();
  }, [source, field, dateRange.from, dateRange.to, dataOwnerId]);

  return { values, loading };
}
