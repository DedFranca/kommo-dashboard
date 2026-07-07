import type { Layout, Layouts } from "react-grid-layout";
import type { DashboardLayoutState, DashboardWidget, WidgetType } from "@/types/dashboard-layout";
import type { DataBinding } from "@/types/data-source";

const BP_KEYS = ["lg", "md", "sm", "xs", "xxs"] as const;
const DEFAULT_SIZES: Record<WidgetType, { w: number; h: number }> = {
  kpi: { w: 4, h: 3 },
  lineChart: { w: 6, h: 6 },
  barChart: { w: 6, h: 6 },
  areaChart: { w: 6, h: 6 },
  pieChart: { w: 6, h: 6 },
  rankingTable: { w: 6, h: 7 },
  cohortTable: { w: 12, h: 7 },
  cohortChart: { w: 12, h: 6 },
  funnelChart: { w: 5, h: 8 },
  heatmapChart: { w: 7, h: 8 },
  performanceChart: { w: 6, h: 7 },
};

export function createWidgetId() {
  return `w-${Date.now().toString(36)}`;
}

export function appendWidgetToLayout(
  state: DashboardLayoutState,
  widget: DashboardWidget,
): DashboardLayoutState {
  const layouts: Layouts = { ...state.layouts };

  for (const bp of BP_KEYS) {
    const items = [...((layouts[bp] as Layout[] | undefined) ?? [])];
    const maxY = items.reduce((m, it) => Math.max(m, it.y + it.h), 0);
    const size = DEFAULT_SIZES[widget.type];
    const colsMap = { lg: 12, md: 10, sm: 6, xs: 4, xxs: 2 };
    const colCount = colsMap[bp];
    items.push({
      i: widget.id,
      x: 0,
      y: maxY,
      w: Math.min(size.w, colCount),
      h: size.h,
      minW: 2,
      minH: 2,
    });
    layouts[bp] = items;
  }

  return {
    ...state,
    widgets: [...state.widgets, widget],
    layouts,
  };
}

export function removeWidgetFromLayout(state: DashboardLayoutState, widgetId: string): DashboardLayoutState {
  const layouts: Layouts = {};
  for (const [bp, items] of Object.entries(state.layouts)) {
    layouts[bp] = (items as Layout[]).filter((l) => l.i !== widgetId);
  }
  return {
    ...state,
    widgets: state.widgets.filter((w) => w.id !== widgetId),
    layouts,
  };
}

export function duplicateWidgetInLayout(
  state: DashboardLayoutState,
  widgetId: string,
): DashboardLayoutState | null {
  const source = state.widgets.find((w) => w.id === widgetId);
  if (!source) return null;

  const newId = createWidgetId();
  const duplicate: DashboardWidget = {
    ...structuredClone(source),
    id: newId,
    title: `${source.title} (cópia)`,
  };

  const layouts: Layouts = { ...state.layouts };
  for (const bp of BP_KEYS) {
    const items = [...((layouts[bp] as Layout[] | undefined) ?? [])];
    const sourceLayout = items.find((l) => l.i === widgetId);
    const maxY = items.reduce((m, it) => Math.max(m, it.y + it.h), 0);
    const size = DEFAULT_SIZES[source.type];
    const colsMap = { lg: 12, md: 10, sm: 6, xs: 4, xxs: 2 };
    const colCount = colsMap[bp];

    if (sourceLayout) {
      items.push({
        ...sourceLayout,
        i: newId,
        x: Math.min(sourceLayout.x + 1, colCount - sourceLayout.w),
        y: sourceLayout.y,
      });
    } else {
      items.push({
        i: newId,
        x: 0,
        y: maxY,
        w: Math.min(size.w, colCount),
        h: size.h,
        minW: 2,
        minH: 2,
      });
    }
    layouts[bp] = items;
  }

  return {
    ...state,
    widgets: [...state.widgets, duplicate],
    layouts,
  };
}

export function updateWidgetBinding(
  widget: DashboardWidget,
  binding: DataBinding,
  title?: string,
): DashboardWidget {
  const props = { ...(widget.props ?? {}), dataBinding: binding } as any;
  
  if (binding.kind === "builtin") {
    if (binding.key === "totalLeads") props.metricKey = "totalLeads";
    if (binding.key === "newLeads") props.metricKey = "newLeads";
    if (binding.key === "conversionRate") {
      props.metricKey = "conversionRate";
      props.format = "percent";
    }
    if (binding.key === "avgClosingDays") {
      props.metricKey = "avgClosingDays";
      props.format = "days";
    }
    if (binding.key === "leadsOverTime") props.chartKey = "leadsOverTime";
    if (binding.key === "salesOverTime") props.chartKey = "salesOverTime";
    if (binding.key === "conversionFunnel") props.chartKey = "conversionFunnel";
    if (binding.key === "responsiblePerformance") props.chartKey = "responsiblePerformance";
    if (binding.key === "leadEntryHeatmap") props.chartKey = "leadEntryHeatmap";
    if (binding.key === "pipelineDistribution") props.tableKey = "byPipeline";
  } else if (binding.kind === "dataset") {
    props.datasetId = binding.datasetId;
    props.xKey = binding.xKey;
    props.yKey = binding.yKey;
  }
  
  return { ...widget, title: title ?? widget.title, props };
}
