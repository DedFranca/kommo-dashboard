import type { Layout, Layouts } from "react-grid-layout";

export const LAYOUT_VERSION = 5;

/** Tipos de widget do dashboard. */
export type WidgetType =
  | "kpi"
  | "cohortTable"
  | "cohortChart"
  | "lineChart"
  | "barChart"
  | "areaChart"
  | "pieChart"
  | "rankingTable"
  | "funnelChart"
  | "heatmapChart"
  | "performanceChart";

export type DashboardWidget = {
  id: string;
  type: WidgetType;
  title: string;
  props?: Record<string, unknown>;
};

export type DashboardLayoutState = {
  version?: number;
  /** Título exibido acima do grid (Analytics). */
  canvasTitle?: string;
  widgets: DashboardWidget[];
  layouts: Layouts;
};

/** Dashboard focado em campos 100% preenchidos no Kommo (Dr. Ivan). */
export const DEFAULT_DASHBOARD_LAYOUT: DashboardLayoutState = {
  version: LAYOUT_VERSION,
  widgets: [
    {
      id: "w-kpi-total",
      type: "kpi",
      title: "Total de Leads",
      props: { metricKey: "totalLeads" },
    },
    {
      id: "w-kpi-leads",
      type: "kpi",
      title: "Leads Criados no Período",
      props: { metricKey: "newLeads" },
    },
    {
      id: "w-kpi-conversion",
      type: "kpi",
      title: "Taxa de Conversão",
      props: { metricKey: "conversionRate", format: "percent" },
    },
    {
      id: "w-kpi-closing",
      type: "kpi",
      title: "Tempo Médio de Fechamento",
      props: { metricKey: "avgClosingDays", format: "days" },
    },
    {
      id: "w-funnel",
      type: "funnelChart",
      title: "Funil de Conversão",
      props: { chartKey: "conversionFunnel" },
    },
    {
      id: "w-leads-period",
      type: "barChart",
      title: "Leads por Período",
      props: { chartKey: "leadsOverTime", subtitle: "Novos leads criados por mês" },
    },
    {
      id: "w-sales-period",
      type: "lineChart",
      title: "Vendas por Período",
      props: { chartKey: "salesOverTime", subtitle: "Negócios ganhos por mês de fechamento" },
    },
    {
      id: "w-responsible",
      type: "performanceChart",
      title: "Performance dos Responsáveis",
      props: { chartKey: "responsiblePerformance" },
    },
    {
      id: "w-pipeline",
      type: "pieChart",
      title: "Distribuição por Pipeline",
      props: { tableKey: "byPipeline" },
    },
    {
      id: "w-heatmap",
      type: "heatmapChart",
      title: "Heatmap de Entrada dos Leads",
      props: { chartKey: "leadEntryHeatmap", subtitle: "Dia da semana × hora de criação" },
    },
  ],
  layouts: {
    lg: [
      { i: "w-kpi-total", x: 0, y: 0, w: 3, h: 3, minW: 2, minH: 2 },
      { i: "w-kpi-leads", x: 3, y: 0, w: 3, h: 3, minW: 2, minH: 2 },
      { i: "w-kpi-conversion", x: 6, y: 0, w: 3, h: 3, minW: 2, minH: 2 },
      { i: "w-kpi-closing", x: 9, y: 0, w: 3, h: 3, minW: 2, minH: 2 },
      { i: "w-funnel", x: 0, y: 3, w: 5, h: 8, minW: 4, minH: 6 },
      { i: "w-leads-period", x: 5, y: 3, w: 7, h: 8, minW: 4, minH: 5 },
      { i: "w-sales-period", x: 0, y: 11, w: 6, h: 7, minW: 4, minH: 5 },
      { i: "w-responsible", x: 6, y: 11, w: 6, h: 7, minW: 4, minH: 5 },
      { i: "w-pipeline", x: 0, y: 18, w: 5, h: 7, minW: 4, minH: 5 },
      { i: "w-heatmap", x: 5, y: 18, w: 7, h: 8, minW: 5, minH: 6 },
    ],
    md: [
      { i: "w-kpi-total", x: 0, y: 0, w: 5, h: 3, minW: 2, minH: 2 },
      { i: "w-kpi-leads", x: 5, y: 0, w: 5, h: 3, minW: 2, minH: 2 },
      { i: "w-kpi-conversion", x: 0, y: 3, w: 5, h: 3, minW: 2, minH: 2 },
      { i: "w-kpi-closing", x: 5, y: 3, w: 5, h: 3, minW: 2, minH: 2 },
      { i: "w-funnel", x: 0, y: 6, w: 10, h: 8, minW: 4, minH: 6 },
      { i: "w-leads-period", x: 0, y: 14, w: 10, h: 7, minW: 4, minH: 5 },
      { i: "w-sales-period", x: 0, y: 21, w: 10, h: 7, minW: 4, minH: 5 },
      { i: "w-responsible", x: 0, y: 28, w: 10, h: 7, minW: 4, minH: 5 },
      { i: "w-pipeline", x: 0, y: 35, w: 10, h: 7, minW: 4, minH: 5 },
      { i: "w-heatmap", x: 0, y: 42, w: 10, h: 8, minW: 5, minH: 6 },
    ],
    sm: [
      { i: "w-kpi-total", x: 0, y: 0, w: 6, h: 3, minW: 2, minH: 2 },
      { i: "w-kpi-leads", x: 0, y: 3, w: 6, h: 3, minW: 2, minH: 2 },
      { i: "w-kpi-conversion", x: 0, y: 6, w: 6, h: 3, minW: 2, minH: 2 },
      { i: "w-kpi-closing", x: 0, y: 9, w: 6, h: 3, minW: 2, minH: 2 },
      { i: "w-funnel", x: 0, y: 12, w: 6, h: 8, minW: 4, minH: 6 },
      { i: "w-leads-period", x: 0, y: 20, w: 6, h: 7, minW: 4, minH: 5 },
      { i: "w-sales-period", x: 0, y: 27, w: 6, h: 7, minW: 4, minH: 5 },
      { i: "w-responsible", x: 0, y: 34, w: 6, h: 7, minW: 4, minH: 5 },
      { i: "w-pipeline", x: 0, y: 41, w: 6, h: 7, minW: 4, minH: 5 },
      { i: "w-heatmap", x: 0, y: 48, w: 6, h: 8, minW: 4, minH: 6 },
    ],
    xs: [
      { i: "w-kpi-total", x: 0, y: 0, w: 4, h: 3, minW: 2, minH: 2 },
      { i: "w-kpi-leads", x: 0, y: 3, w: 4, h: 3, minW: 2, minH: 2 },
      { i: "w-kpi-conversion", x: 0, y: 6, w: 4, h: 3, minW: 2, minH: 2 },
      { i: "w-kpi-closing", x: 0, y: 9, w: 4, h: 3, minW: 2, minH: 2 },
      { i: "w-funnel", x: 0, y: 12, w: 4, h: 8, minW: 2, minH: 6 },
      { i: "w-leads-period", x: 0, y: 20, w: 4, h: 7, minW: 2, minH: 5 },
      { i: "w-sales-period", x: 0, y: 27, w: 4, h: 7, minW: 2, minH: 5 },
      { i: "w-responsible", x: 0, y: 34, w: 4, h: 7, minW: 2, minH: 5 },
      { i: "w-pipeline", x: 0, y: 41, w: 4, h: 7, minW: 2, minH: 5 },
      { i: "w-heatmap", x: 0, y: 48, w: 4, h: 8, minW: 2, minH: 6 },
    ],
    xxs: [
      { i: "w-kpi-total", x: 0, y: 0, w: 2, h: 3, minW: 2, minH: 2 },
      { i: "w-kpi-leads", x: 0, y: 3, w: 2, h: 3, minW: 2, minH: 2 },
      { i: "w-kpi-conversion", x: 0, y: 6, w: 2, h: 3, minW: 2, minH: 2 },
      { i: "w-kpi-closing", x: 0, y: 9, w: 2, h: 3, minW: 2, minH: 2 },
      { i: "w-funnel", x: 0, y: 12, w: 2, h: 8, minW: 2, minH: 6 },
      { i: "w-leads-period", x: 0, y: 20, w: 2, h: 7, minW: 2, minH: 5 },
      { i: "w-sales-period", x: 0, y: 27, w: 2, h: 7, minW: 2, minH: 5 },
      { i: "w-responsible", x: 0, y: 34, w: 2, h: 7, minW: 2, minH: 5 },
      { i: "w-pipeline", x: 0, y: 41, w: 2, h: 7, minW: 2, minH: 5 },
      { i: "w-heatmap", x: 0, y: 48, w: 2, h: 8, minW: 2, minH: 6 },
    ],
  },
};

const LEGACY_WIDGET_IDS = new Set(["w-leads", "w-pipeline", "w-chart", "w-cohort", "w-cohort-chart"]);

function isLegacyLayout(widgets: DashboardWidget[]): boolean {
  if (!widgets.length) return true;
  const hasNewWidgets = widgets.some((w) =>
    ["w-funnel", "w-heatmap", "w-responsible", "w-kpi-closing", "w-kpi-total"].includes(w.id),
  );
  if (hasNewWidgets) return false;
  return widgets.every((w) => LEGACY_WIDGET_IDS.has(w.id) || w.id.startsWith("w-cohort")) && widgets.length <= 12;
}

export function normalizeDashboardLayout(raw: unknown): DashboardLayoutState {
  const base = structuredClone(DEFAULT_DASHBOARD_LAYOUT);
  if (!raw || typeof raw !== "object") return base;

  const obj = raw as Partial<DashboardLayoutState>;

  if (!obj.version || obj.version < LAYOUT_VERSION || isLegacyLayout(obj.widgets ?? [])) {
    return base;
  }

  const widgets = Array.isArray(obj.widgets) && obj.widgets.length ? obj.widgets : base.widgets;

  const mergedLayouts: Layouts = { ...base.layouts };
  const rawLayouts = obj.layouts && typeof obj.layouts === "object" ? (obj.layouts as Layouts) : undefined;
  if (rawLayouts) {
    for (const key of Object.keys(mergedLayouts)) {
      const bp = key as keyof Layouts;
      const items = rawLayouts[bp];
      if (Array.isArray(items) && items.length > 0) {
        mergedLayouts[bp] = items as Layout[];
      }
    }
  }

  return { version: obj.version ?? LAYOUT_VERSION, widgets, layouts: mergedLayouts };
}
