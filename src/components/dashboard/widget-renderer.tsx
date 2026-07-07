"use client";

import { CohortChart } from "@/components/dashboard/cohort-chart";
import { CohortTable } from "@/components/dashboard/cohort-table";
import { EmptyDataState } from "@/components/dashboard/widget-config/empty-data-state";
import { WidgetPreviewRenderer } from "@/components/dashboard/widget-config/widget-preview-renderer";
import { useWidgetData } from "@/hooks/use-widget-data";
import type { DateRange } from "@/lib/date-range";
import type { DashboardWidget } from "@/types/dashboard-layout";
import type { CohortRow } from "@/types/dashboard-metrics";

type Props = {
  widget: DashboardWidget;
  dateRange: DateRange;
  /** Criador do layout compartilhado — datasets CSV/Sheets são lidos da conta dele. */
  dataOwnerId?: string;
};

export function WidgetRenderer({ widget, dateRange, dataOwnerId }: Props) {
  const { payload, loading, error, empty } = useWidgetData(widget, dateRange, dataOwnerId);

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <span className="text-xs text-slate-400">Carregando…</span>
      </div>
    );
  }

  if (empty || !payload) {
    return <EmptyDataState compact message={error ?? undefined} />;
  }

  if ("cohort" in payload && payload.cohort) {
    const c = payload.cohort as { rows: CohortRow[]; total?: CohortRow };
    const total =
      c.total ??
      ({
        weekLabel: "Total",
        leads: c.rows.reduce((a, r) => a + r.leads, 0),
        conversions: c.rows.reduce((a, r) => a + r.conversions, 0),
        pctWeek0: 0,
        pctWeek1: 0,
        pctWeek2: 0,
        pctWeek3: 0,
        pctMonth0: 0,
        pctMonth1: 0,
        conversionRate: 0,
      } as CohortRow);

    if (widget.type === "cohortChart") {
      return <CohortChart title={widget.title} rows={c.rows} total={total} />;
    }
    return <CohortTable title={widget.title} rows={c.rows} total={total} />;
  }

  return (
    <div className="h-full min-h-0 overflow-hidden">
      <WidgetPreviewRenderer widget={widget} payload={payload} />
    </div>
  );
}
