import { createWidgetId } from "@/lib/layout-widgets";
import type { DashboardWidget, WidgetType } from "@/types/dashboard-layout";
import {
  buildPresetQueryConfig,
  EMPTY_WIDGET_QUERY,
  setWidgetQueryConfig,
  type WidgetQueryConfig,
  type WidgetQueryPreset,
} from "@/types/widget-query";

export type WidgetTemplate = {
  id: string;
  label: string;
  description: string;
  widgetType: WidgetType;
  preset?: WidgetQueryPreset;
  queryConfig?: WidgetQueryConfig;
};

export const WIDGET_TEMPLATES: WidgetTemplate[] = [
  {
    id: "kpi-leads",
    label: "Novos Leads",
    description: "Total de leads criados no período",
    widgetType: "kpi",
    preset: "newLeads",
  },
  {
    id: "kpi-conversion",
    label: "Taxa de Conversão",
    description: "Percentual de leads convertidos",
    widgetType: "kpi",
    preset: "conversionRate",
  },
  {
    id: "chart-wins",
    label: "Leads Ganhos",
    description: "Leads ganhos ao longo do tempo",
    widgetType: "lineChart",
    preset: "leadsWonOverTime",
  },
  {
    id: "chart-origin",
    label: "Por Origem",
    description: "Distribuição por origem do lead",
    widgetType: "pieChart",
    preset: "closedByOrigin",
  },
  {
    id: "table-location",
    label: "Ranking por Local",
    description: "Consultas fechadas por local",
    widgetType: "rankingTable",
    preset: "closedByLocation",
  },
  {
    id: "cohort",
    label: "Análise de Coorte",
    description: "Conversão por coorte temporal",
    widgetType: "cohortTable",
    preset: "cohort",
  },
];

export function buildDefaultQueryConfig(type: WidgetType, preset?: WidgetQueryPreset): WidgetQueryConfig {
  if (preset) return buildPresetQueryConfig(preset, type);
  return { ...EMPTY_WIDGET_QUERY };
}

export function createNewWidget(input: {
  type: WidgetType;
  title: string;
  preset?: WidgetQueryPreset;
  queryConfig?: WidgetQueryConfig;
}): DashboardWidget {
  const queryConfig =
    input.queryConfig ??
    (input.preset ? buildPresetQueryConfig(input.preset, input.type) : buildDefaultQueryConfig(input.type));

  const widget: DashboardWidget = {
    id: createWidgetId(),
    type: input.type,
    title: input.title,
  };

  return setWidgetQueryConfig(widget, queryConfig);
}

export function createWidgetFromTemplate(template: WidgetTemplate): DashboardWidget {
  return createNewWidget({
    type: template.widgetType,
    title: template.label,
    preset: template.preset,
    queryConfig: template.queryConfig,
  });
}
