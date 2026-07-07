import type { DashboardLayoutState } from "./dashboard-layout";

export type LayoutPreset = {
  id: string;
  name: string;
  description?: string;
  layout: DashboardLayoutState;
  isDefault?: boolean;
  createdAt?: Date;
  updatedAt?: Date;
};

export type LayoutPresetsCollection = {
  presets: LayoutPreset[];
  activePresetId?: string;
  lastUpdated?: Date;
};

// Presets predefinidos
export const COMPACT_LAYOUT: LayoutPreset = {
  id: "preset-compact",
  name: "Compacto",
  description: "Apenas KPIs e gráfico principal",
  isDefault: false,
  layout: {
    version: 2,
    widgets: [
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
        id: "w-chart-wins",
        type: "lineChart",
        title: "Lead Ganho",
        props: { chartKey: "leadsWon", subtitle: "Data da criação do negócio para os ganhos do período" },
      },
    ],
    layouts: {
      lg: [
        { i: "w-kpi-leads", x: 0, y: 0, w: 4, h: 3, minW: 2, minH: 2 },
        { i: "w-kpi-conversion", x: 4, y: 0, w: 4, h: 3, minW: 2, minH: 2 },
        { i: "w-kpi-appointments", x: 8, y: 0, w: 4, h: 3, minW: 2, minH: 2 },
        { i: "w-chart-wins", x: 0, y: 3, w: 12, h: 6, minW: 4, minH: 4 },
      ],
      md: [
        { i: "w-kpi-leads", x: 0, y: 0, w: 5, h: 3, minW: 2, minH: 2 },
        { i: "w-kpi-conversion", x: 5, y: 0, w: 5, h: 3, minW: 2, minH: 2 },
        { i: "w-kpi-appointments", x: 0, y: 3, w: 10, h: 3, minW: 2, minH: 2 },
        { i: "w-chart-wins", x: 0, y: 6, w: 10, h: 6, minW: 4, minH: 4 },
      ],
      sm: [
        { i: "w-kpi-leads", x: 0, y: 0, w: 3, h: 3, minW: 2, minH: 2 },
        { i: "w-kpi-conversion", x: 3, y: 0, w: 3, h: 3, minW: 2, minH: 2 },
        { i: "w-kpi-appointments", x: 0, y: 3, w: 6, h: 3, minW: 2, minH: 2 },
        { i: "w-chart-wins", x: 0, y: 6, w: 6, h: 6, minW: 4, minH: 4 },
      ],
      xs: [
        { i: "w-kpi-leads", x: 0, y: 0, w: 4, h: 3, minW: 2, minH: 2 },
        { i: "w-kpi-conversion", x: 0, y: 3, w: 4, h: 3, minW: 2, minH: 2 },
        { i: "w-kpi-appointments", x: 0, y: 6, w: 4, h: 3, minW: 2, minH: 2 },
        { i: "w-chart-wins", x: 0, y: 9, w: 4, h: 6, minW: 2, minH: 4 },
      ],
      xxs: [
        { i: "w-kpi-leads", x: 0, y: 0, w: 2, h: 3, minW: 2, minH: 2 },
        { i: "w-kpi-conversion", x: 0, y: 3, w: 2, h: 3, minW: 2, minH: 2 },
        { i: "w-kpi-appointments", x: 0, y: 6, w: 2, h: 3, minW: 2, minH: 2 },
        { i: "w-chart-wins", x: 0, y: 9, w: 2, h: 6, minW: 2, minH: 4 },
      ],
    },
  },
};

export const DETAILED_LAYOUT: LayoutPreset = {
  id: "preset-detailed",
  name: "Detalhado",
  description: "Layout completo com tabelas e análises",
  isDefault: false,
  layout: {
    version: 2,
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
        id: "w-chart-wins",
        type: "lineChart",
        title: "Lead Ganho",
        props: { chartKey: "leadsWon", subtitle: "Data da criação do negócio para os ganhos do período" },
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
        { i: "w-kpi-leads", x: 0, y: 7, w: 4, h: 3, minW: 2, minH: 2 },
        { i: "w-kpi-conversion", x: 4, y: 7, w: 4, h: 3, minW: 2, minH: 2 },
        { i: "w-kpi-appointments", x: 8, y: 7, w: 4, h: 3, minW: 2, minH: 2 },
        { i: "w-chart-wins", x: 0, y: 10, w: 12, h: 6, minW: 4, minH: 4 },
        { i: "w-table-location", x: 0, y: 16, w: 6, h: 7, minW: 3, minH: 5 },
        { i: "w-table-origin", x: 6, y: 16, w: 6, h: 7, minW: 3, minH: 5 },
      ],
      md: [
        { i: "w-cohort", x: 0, y: 0, w: 10, h: 7, minW: 5, minH: 5 },
        { i: "w-kpi-leads", x: 0, y: 7, w: 5, h: 3, minW: 2, minH: 2 },
        { i: "w-kpi-conversion", x: 5, y: 7, w: 5, h: 3, minW: 2, minH: 2 },
        { i: "w-kpi-appointments", x: 0, y: 10, w: 10, h: 3, minW: 2, minH: 2 },
        { i: "w-chart-wins", x: 0, y: 13, w: 10, h: 6, minW: 4, minH: 4 },
        { i: "w-table-location", x: 0, y: 19, w: 10, h: 7, minW: 3, minH: 5 },
        { i: "w-table-origin", x: 0, y: 26, w: 10, h: 7, minW: 3, minH: 5 },
      ],
      sm: [
        { i: "w-cohort", x: 0, y: 0, w: 6, h: 7, minW: 4, minH: 5 },
        { i: "w-kpi-leads", x: 0, y: 7, w: 3, h: 3, minW: 2, minH: 2 },
        { i: "w-kpi-conversion", x: 3, y: 7, w: 3, h: 3, minW: 2, minH: 2 },
        { i: "w-kpi-appointments", x: 0, y: 10, w: 6, h: 3, minW: 2, minH: 2 },
        { i: "w-chart-wins", x: 0, y: 13, w: 6, h: 6, minW: 4, minH: 4 },
        { i: "w-table-location", x: 0, y: 19, w: 6, h: 7, minW: 3, minH: 5 },
        { i: "w-table-origin", x: 0, y: 26, w: 6, h: 7, minW: 3, minH: 5 },
      ],
      xs: [
        { i: "w-cohort", x: 0, y: 0, w: 4, h: 7, minW: 2, minH: 5 },
        { i: "w-kpi-leads", x: 0, y: 7, w: 4, h: 3, minW: 2, minH: 2 },
        { i: "w-kpi-conversion", x: 0, y: 10, w: 4, h: 3, minW: 2, minH: 2 },
        { i: "w-kpi-appointments", x: 0, y: 13, w: 4, h: 3, minW: 2, minH: 2 },
        { i: "w-chart-wins", x: 0, y: 16, w: 4, h: 6, minW: 2, minH: 4 },
        { i: "w-table-location", x: 0, y: 22, w: 4, h: 7, minW: 2, minH: 5 },
        { i: "w-table-origin", x: 0, y: 29, w: 4, h: 7, minW: 2, minH: 5 },
      ],
      xxs: [
        { i: "w-cohort", x: 0, y: 0, w: 2, h: 8, minW: 2, minH: 5 },
        { i: "w-kpi-leads", x: 0, y: 8, w: 2, h: 3, minW: 2, minH: 2 },
        { i: "w-kpi-conversion", x: 0, y: 11, w: 2, h: 3, minW: 2, minH: 2 },
        { i: "w-kpi-appointments", x: 0, y: 14, w: 2, h: 3, minW: 2, minH: 2 },
        { i: "w-chart-wins", x: 0, y: 17, w: 2, h: 6, minW: 2, minH: 4 },
        { i: "w-table-location", x: 0, y: 23, w: 2, h: 7, minW: 2, minH: 5 },
        { i: "w-table-origin", x: 0, y: 30, w: 2, h: 7, minW: 2, minH: 5 },
      ],
    },
  },
};

export const ANALYTICS_LAYOUT: LayoutPreset = {
  id: "preset-analytics",
  name: "Análise Avançada",
  description: "Foco em tabelas e rankings",
  isDefault: false,
  layout: {
    version: 2,
    widgets: [
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
    ],
    layouts: {
      lg: [
        { i: "w-table-location", x: 0, y: 0, w: 6, h: 8, minW: 3, minH: 5 },
        { i: "w-table-origin", x: 6, y: 0, w: 6, h: 8, minW: 3, minH: 5 },
        { i: "w-kpi-leads", x: 0, y: 8, w: 6, h: 3, minW: 2, minH: 2 },
        { i: "w-kpi-conversion", x: 6, y: 8, w: 6, h: 3, minW: 2, minH: 2 },
      ],
      md: [
        { i: "w-table-location", x: 0, y: 0, w: 10, h: 8, minW: 3, minH: 5 },
        { i: "w-table-origin", x: 0, y: 8, w: 10, h: 8, minW: 3, minH: 5 },
        { i: "w-kpi-leads", x: 0, y: 16, w: 5, h: 3, minW: 2, minH: 2 },
        { i: "w-kpi-conversion", x: 5, y: 16, w: 5, h: 3, minW: 2, minH: 2 },
      ],
      sm: [
        { i: "w-table-location", x: 0, y: 0, w: 6, h: 8, minW: 3, minH: 5 },
        { i: "w-table-origin", x: 0, y: 8, w: 6, h: 8, minW: 3, minH: 5 },
        { i: "w-kpi-leads", x: 0, y: 16, w: 3, h: 3, minW: 2, minH: 2 },
        { i: "w-kpi-conversion", x: 3, y: 16, w: 3, h: 3, minW: 2, minH: 2 },
      ],
      xs: [
        { i: "w-table-location", x: 0, y: 0, w: 4, h: 8, minW: 2, minH: 5 },
        { i: "w-table-origin", x: 0, y: 8, w: 4, h: 8, minW: 2, minH: 5 },
        { i: "w-kpi-leads", x: 0, y: 16, w: 4, h: 3, minW: 2, minH: 2 },
        { i: "w-kpi-conversion", x: 0, y: 19, w: 4, h: 3, minW: 2, minH: 2 },
      ],
      xxs: [
        { i: "w-table-location", x: 0, y: 0, w: 2, h: 8, minW: 2, minH: 5 },
        { i: "w-table-origin", x: 0, y: 8, w: 2, h: 8, minW: 2, minH: 5 },
        { i: "w-kpi-leads", x: 0, y: 16, w: 2, h: 3, minW: 2, minH: 2 },
        { i: "w-kpi-conversion", x: 0, y: 19, w: 2, h: 3, minW: 2, minH: 2 },
      ],
    },
  },
};

export const DEFAULT_PRESETS = [COMPACT_LAYOUT, DETAILED_LAYOUT, ANALYTICS_LAYOUT];
