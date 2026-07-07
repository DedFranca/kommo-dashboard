import type { WidgetType } from "@/types/dashboard-layout";

export type WidgetCategory = "kpi" | "chart" | "table" | "advanced";

export type WidgetCatalogEntry = {
  type: WidgetType | PlannedWidgetType;
  label: string;
  description: string;
  category: WidgetCategory;
  icon: string;
  available: boolean;
  renderAs?: WidgetType;
  defaultSize: { w: number; h: number };
};

export type PlannedWidgetType =
  | "stackedBarChart"
  | "donutChart"
  | "stackedAreaChart"
  | "funnelChart"
  | "pivotTable"
  | "heatmap"
  | "scatterPlot";

export const WIDGET_CATALOG: WidgetCatalogEntry[] = [
  {
    type: "kpi",
    label: "Indicador (KPI)",
    description: "Total de Leads, Conversão, Ticket Médio, Receita",
    category: "kpi",
    icon: "📊",
    available: true,
    defaultSize: { w: 4, h: 3 },
  },
  {
    type: "lineChart",
    label: "Gráfico de Linha",
    description: "Tendência ao longo do tempo",
    category: "chart",
    icon: "📈",
    available: true,
    defaultSize: { w: 6, h: 6 },
  },
  {
    type: "barChart",
    label: "Gráfico de Barras",
    description: "Comparação entre categorias",
    category: "chart",
    icon: "📊",
    available: true,
    defaultSize: { w: 6, h: 6 },
  },
  {
    type: "stackedBarChart",
    label: "Barra Empilhada",
    description: "Composição por categoria",
    category: "chart",
    icon: "📊",
    available: false,
    renderAs: "barChart",
    defaultSize: { w: 6, h: 6 },
  },
  {
    type: "areaChart",
    label: "Gráfico de Área",
    description: "Volume acumulado ao longo do tempo",
    category: "chart",
    icon: "📉",
    available: true,
    defaultSize: { w: 6, h: 6 },
  },
  {
    type: "stackedAreaChart",
    label: "Área Empilhada",
    description: "Composição temporal",
    category: "chart",
    icon: "📉",
    available: false,
    renderAs: "areaChart",
    defaultSize: { w: 6, h: 6 },
  },
  {
    type: "pieChart",
    label: "Gráfico de Pizza",
    description: "Distribuição percentual",
    category: "chart",
    icon: "🥧",
    available: true,
    defaultSize: { w: 6, h: 6 },
  },
  {
    type: "donutChart",
    label: "Gráfico de Rosca",
    description: "Distribuição com centro vazio",
    category: "chart",
    icon: "🍩",
    available: false,
    renderAs: "pieChart",
    defaultSize: { w: 6, h: 6 },
  },
  {
    type: "funnelChart",
    label: "Funil",
    description: "Etapas de conversão",
    category: "chart",
    icon: "🔻",
    available: false,
    defaultSize: { w: 6, h: 7 },
  },
  {
    type: "rankingTable",
    label: "Tabela",
    description: "Ranking e listagens",
    category: "table",
    icon: "📋",
    available: true,
    defaultSize: { w: 6, h: 7 },
  },
  {
    type: "pivotTable",
    label: "Tabela Dinâmica",
    description: "Agregação cruzada de dimensões",
    category: "table",
    icon: "🔢",
    available: false,
    renderAs: "rankingTable",
    defaultSize: { w: 8, h: 8 },
  },
  {
    type: "cohortTable",
    label: "Tabela cruzada",
    description: "Colunas e métricas configuráveis (2 dimensões)",
    category: "table",
    icon: "📅",
    available: true,
    defaultSize: { w: 12, h: 7 },
  },
  {
    type: "cohortChart",
    label: "Gráfico de Coorte",
    description: "Visualização de coorte",
    category: "chart",
    icon: "📅",
    available: true,
    defaultSize: { w: 12, h: 6 },
  },
  {
    type: "heatmap",
    label: "Heatmap",
    description: "Intensidade em matriz",
    category: "advanced",
    icon: "🌡️",
    available: false,
    defaultSize: { w: 8, h: 7 },
  },
  {
    type: "scatterPlot",
    label: "Scatter Plot",
    description: "Correlação entre duas métricas",
    category: "advanced",
    icon: "⚬",
    available: false,
    defaultSize: { w: 6, h: 6 },
  },
];

export const WIDGET_CATEGORIES: { id: WidgetCategory; label: string }[] = [
  { id: "kpi", label: "KPIs" },
  { id: "chart", label: "Gráficos" },
  { id: "table", label: "Tabelas" },
  { id: "advanced", label: "Avançado" },
];

export function getAvailableWidgets(): WidgetCatalogEntry[] {
  return WIDGET_CATALOG.filter((w) => w.available);
}

export function getWidgetsByCategory(category: WidgetCategory): WidgetCatalogEntry[] {
  return WIDGET_CATALOG.filter((w) => w.category === category);
}

export function resolveRenderType(entry: WidgetCatalogEntry): WidgetType {
  if (entry.available) return entry.type as WidgetType;
  return entry.renderAs ?? (entry.type as WidgetType);
}
