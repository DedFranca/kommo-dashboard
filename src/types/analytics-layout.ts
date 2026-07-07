import type { Layout, Layouts } from "react-grid-layout";
import { getWidgetQueryConfig, setWidgetQueryConfig } from "@/types/widget-query";
import type { DashboardLayoutState, DashboardWidget } from "@/types/dashboard-layout";

export const ANALYTICS_LAYOUT_VERSION = 3;

/** Layout padrão da área Analytics (widgets personalizáveis — base V1). */
export const DEFAULT_ANALYTICS_LAYOUT: DashboardLayoutState = {
  version: ANALYTICS_LAYOUT_VERSION,
  widgets: [
    {
      id: "w-cohort",
      type: "cohortTable",
      title: "Análise de Coorte: Conversão dos Leads Criados ao Longo do Tempo",
    },
    {
      id: "w-kpi-leads",
      type: "kpi",
      title: "Novos Leads Gerados",
      props: { metricKey: "newLeads" },
    },
    {
      id: "w-kpi-conversion",
      type: "kpi",
      title: "Taxa de Conversão",
      props: { metricKey: "conversionRate", format: "percent" },
    },
    {
      id: "w-kpi-appointments",
      type: "kpi",
      title: "Agendamentos dos Leads Criados",
      props: { metricKey: "appointments" },
    },
    {
      id: "w-cohort-chart",
      type: "cohortChart",
      title: "Coorte — Leads vs Conversões (gráfico)",
    },
    {
      id: "w-chart-wins",
      type: "lineChart",
      title: "Lead Ganho (linha)",
      props: { chartKey: "leadsWon", subtitle: "Data de fechamento dos negócios ganhos no período" },
    },
    {
      id: "w-chart-bar",
      type: "barChart",
      title: "Leads Ganhos por Mês (barras)",
      props: { chartKey: "leadsWon" },
    },
    {
      id: "w-chart-area",
      type: "areaChart",
      title: "Tendência de Leads Ganhos (área)",
      props: { chartKey: "leadsWon" },
    },
    {
      id: "w-chart-pie",
      type: "pieChart",
      title: "Distribuição por Origem",
      props: { tableKey: "byOrigin" },
    },
    {
      id: "w-table-location",
      type: "rankingTable",
      title: "Consultas Fechadas por Local",
      props: { tableKey: "byLocation" },
    },
    {
      id: "w-table-origin",
      type: "rankingTable",
      title: "Consultas Fechadas por Origem",
      props: { tableKey: "byOrigin" },
    },
  ],
  layouts: {
    lg: [
      { i: "w-cohort", x: 0, y: 0, w: 12, h: 7, minW: 6, minH: 5 },
      { i: "w-cohort-chart", x: 0, y: 7, w: 12, h: 6, minW: 6, minH: 4 },
      { i: "w-kpi-leads", x: 0, y: 13, w: 4, h: 3, minW: 2, minH: 2 },
      { i: "w-kpi-conversion", x: 4, y: 13, w: 4, h: 3, minW: 2, minH: 2 },
      { i: "w-kpi-appointments", x: 8, y: 13, w: 4, h: 3, minW: 2, minH: 2 },
      { i: "w-chart-wins", x: 0, y: 16, w: 6, h: 6, minW: 4, minH: 4 },
      { i: "w-chart-bar", x: 6, y: 16, w: 6, h: 6, minW: 4, minH: 4 },
      { i: "w-chart-area", x: 0, y: 22, w: 6, h: 6, minW: 4, minH: 4 },
      { i: "w-chart-pie", x: 6, y: 22, w: 6, h: 6, minW: 4, minH: 4 },
      { i: "w-table-location", x: 0, y: 28, w: 6, h: 7, minW: 3, minH: 5 },
      { i: "w-table-origin", x: 6, y: 28, w: 6, h: 7, minW: 3, minH: 5 },
    ],
    md: [
      { i: "w-cohort", x: 0, y: 0, w: 10, h: 7, minW: 5, minH: 5 },
      { i: "w-cohort-chart", x: 0, y: 7, w: 10, h: 6, minW: 5, minH: 4 },
      { i: "w-kpi-leads", x: 0, y: 13, w: 5, h: 3, minW: 2, minH: 2 },
      { i: "w-kpi-conversion", x: 5, y: 13, w: 5, h: 3, minW: 2, minH: 2 },
      { i: "w-kpi-appointments", x: 0, y: 16, w: 10, h: 3, minW: 2, minH: 2 },
      { i: "w-chart-wins", x: 0, y: 19, w: 10, h: 6, minW: 4, minH: 4 },
      { i: "w-chart-bar", x: 0, y: 25, w: 10, h: 6, minW: 4, minH: 4 },
      { i: "w-chart-area", x: 0, y: 31, w: 10, h: 6, minW: 4, minH: 4 },
      { i: "w-chart-pie", x: 0, y: 37, w: 10, h: 6, minW: 4, minH: 4 },
      { i: "w-table-location", x: 0, y: 43, w: 10, h: 7, minW: 3, minH: 5 },
      { i: "w-table-origin", x: 0, y: 50, w: 10, h: 7, minW: 3, minH: 5 },
    ],
    sm: [
      { i: "w-cohort", x: 0, y: 0, w: 6, h: 7, minW: 4, minH: 5 },
      { i: "w-cohort-chart", x: 0, y: 7, w: 6, h: 6, minW: 4, minH: 4 },
      { i: "w-kpi-leads", x: 0, y: 13, w: 6, h: 3, minW: 2, minH: 2 },
      { i: "w-kpi-conversion", x: 0, y: 16, w: 6, h: 3, minW: 2, minH: 2 },
      { i: "w-kpi-appointments", x: 0, y: 19, w: 6, h: 3, minW: 2, minH: 2 },
      { i: "w-chart-wins", x: 0, y: 22, w: 6, h: 6, minW: 4, minH: 4 },
      { i: "w-chart-bar", x: 0, y: 28, w: 6, h: 6, minW: 4, minH: 4 },
      { i: "w-chart-area", x: 0, y: 34, w: 6, h: 6, minW: 4, minH: 4 },
      { i: "w-chart-pie", x: 0, y: 40, w: 6, h: 6, minW: 4, minH: 4 },
      { i: "w-table-location", x: 0, y: 46, w: 6, h: 7, minW: 3, minH: 5 },
      { i: "w-table-origin", x: 0, y: 53, w: 6, h: 7, minW: 3, minH: 5 },
    ],
    xs: [
      { i: "w-cohort", x: 0, y: 0, w: 4, h: 7, minW: 2, minH: 5 },
      { i: "w-cohort-chart", x: 0, y: 7, w: 4, h: 6, minW: 2, minH: 4 },
      { i: "w-kpi-leads", x: 0, y: 13, w: 4, h: 3, minW: 2, minH: 2 },
      { i: "w-kpi-conversion", x: 0, y: 16, w: 4, h: 3, minW: 2, minH: 2 },
      { i: "w-kpi-appointments", x: 0, y: 19, w: 4, h: 3, minW: 2, minH: 2 },
      { i: "w-chart-wins", x: 0, y: 22, w: 4, h: 6, minW: 2, minH: 4 },
      { i: "w-chart-bar", x: 0, y: 28, w: 4, h: 6, minW: 2, minH: 4 },
      { i: "w-chart-area", x: 0, y: 34, w: 4, h: 6, minW: 2, minH: 4 },
      { i: "w-chart-pie", x: 0, y: 40, w: 4, h: 6, minW: 2, minH: 4 },
      { i: "w-table-location", x: 0, y: 46, w: 4, h: 7, minW: 2, minH: 5 },
      { i: "w-table-origin", x: 0, y: 53, w: 4, h: 7, minW: 2, minH: 5 },
    ],
    xxs: [
      { i: "w-cohort", x: 0, y: 0, w: 2, h: 8, minW: 2, minH: 5 },
      { i: "w-cohort-chart", x: 0, y: 8, w: 2, h: 6, minW: 2, minH: 4 },
      { i: "w-kpi-leads", x: 0, y: 14, w: 2, h: 3, minW: 2, minH: 2 },
      { i: "w-kpi-conversion", x: 0, y: 17, w: 2, h: 3, minW: 2, minH: 2 },
      { i: "w-kpi-appointments", x: 0, y: 20, w: 2, h: 3, minW: 2, minH: 2 },
      { i: "w-chart-wins", x: 0, y: 23, w: 2, h: 6, minW: 2, minH: 4 },
      { i: "w-chart-bar", x: 0, y: 29, w: 2, h: 6, minW: 2, minH: 4 },
      { i: "w-chart-area", x: 0, y: 35, w: 2, h: 6, minW: 2, minH: 4 },
      { i: "w-chart-pie", x: 0, y: 41, w: 2, h: 6, minW: 2, minH: 4 },
      { i: "w-table-location", x: 0, y: 47, w: 2, h: 7, minW: 2, minH: 5 },
      { i: "w-table-origin", x: 0, y: 54, w: 2, h: 7, minW: 2, minH: 5 },
    ],
  },
};

/** Layout vazio (canvas em branco) para novos layouts criados pelo usuário. */
export const EMPTY_ANALYTICS_LAYOUT: DashboardLayoutState = {
  version: ANALYTICS_LAYOUT_VERSION,
  widgets: [],
  layouts: { lg: [], md: [], sm: [], xs: [], xxs: [] },
};

/**
 * Normaliza um layout preservando layouts vazios (sem substituir pelo padrão).
 * Usado pelos presets, onde um canvas em branco é válido.
 */
export function coerceAnalyticsLayout(raw: unknown): DashboardLayoutState {
  if (!raw || typeof raw !== "object") return structuredClone(EMPTY_ANALYTICS_LAYOUT);

  const obj = raw as Partial<DashboardLayoutState>;
  const widgets = Array.isArray(obj.widgets)
    ? obj.widgets.map((w) => setWidgetQueryConfig(w, getWidgetQueryConfig(w)))
    : [];

  const layouts: Layouts = { ...structuredClone(EMPTY_ANALYTICS_LAYOUT.layouts) };
  const rawLayouts = obj.layouts && typeof obj.layouts === "object" ? (obj.layouts as Layouts) : undefined;
  if (rawLayouts) {
    for (const key of Object.keys(layouts)) {
      const bp = key as keyof Layouts;
      const items = rawLayouts[bp];
      if (Array.isArray(items)) layouts[bp] = items as Layout[];
    }
  }

  return {
    version: ANALYTICS_LAYOUT_VERSION,
    canvasTitle: typeof obj.canvasTitle === "string" ? obj.canvasTitle.trim() || undefined : undefined,
    widgets,
    layouts,
  };
}

const LEGACY_WIDGET_IDS = new Set(["w-leads", "w-pipeline", "w-chart"]);

function isLegacyLayout(widgets: DashboardWidget[]): boolean {
  if (!widgets.length) return true;
  return widgets.every((w) => LEGACY_WIDGET_IDS.has(w.id)) && widgets.length <= 3;
}

export function normalizeAnalyticsLayout(raw: unknown): DashboardLayoutState {
  const base = structuredClone(DEFAULT_ANALYTICS_LAYOUT);
  if (!raw || typeof raw !== "object") return base;

  const obj = raw as Partial<DashboardLayoutState>;

  if (!obj.version || obj.version < ANALYTICS_LAYOUT_VERSION || isLegacyLayout(obj.widgets ?? [])) {
    return base;
  }

  const widgets = (Array.isArray(obj.widgets) && obj.widgets.length ? obj.widgets : base.widgets).map((w) =>
    setWidgetQueryConfig(w, getWidgetQueryConfig(w)),
  );

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

  return {
    version: obj.version ?? ANALYTICS_LAYOUT_VERSION,
    canvasTitle: typeof obj.canvasTitle === "string" ? obj.canvasTitle.trim() || undefined : undefined,
    widgets,
    layouts: mergedLayouts,
  };
}
