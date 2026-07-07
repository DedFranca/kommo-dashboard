import type { MetricSpec, QuerySpec } from "@/types/analytics";
import type { DashboardWidget } from "@/types/dashboard-layout";
import type { BuiltinDataKey, DataBinding } from "@/types/data-source";

export type {
  DataSourceType,
  UnifiedDataSource,
  DataSourcePreview,
} from "@/types/data-source-registry";
export { describeWidgetDataSource, toWidgetDataSource } from "@/types/data-source-registry";

export type WidgetFilterOperator = "eq" | "neq" | "in" | "gt" | "lt" | "between" | "contains";

export type WidgetFilter = {
  field: string;
  operator: WidgetFilterOperator;
  value: string | string[] | number;
};

export type WidgetDataSource =
  | { kind: "kommo" }
  | { kind: "dataset"; datasetId: string }
  | { kind: "google_sheets"; connectionId: string };

export type WidgetDateRange = {
  mode: "inherit" | "custom";
  field?: string;
  from?: string;
  to?: string;
};

/** Granularidade de agrupamento quando a dimensão é uma data/hora. */
export type DateGranularity = "day" | "week" | "month" | "year";

/** Formato de exibição do valor de um KPI. */
export type KpiFormat = "number" | "percent" | "currency";

export const KPI_FORMAT_LABELS: Record<KpiFormat, string> = {
  number: "Número",
  percent: "Percentual (%)",
  currency: "Moeda (R$)",
};

/** Presets Kommo pré-configurados (coorte, etc.) */
export type WidgetQueryPreset = "cohort" | "newLeads" | "conversionRate" | "appointments" | "leadsWonOverTime" | "closedByLocation" | "closedByOrigin";

export type WidgetQueryConfig = {
  source: WidgetDataSource | null;
  dimensions: string[];
  /** Rótulos exibidos nos cabeçalhos de coluna (chave = nome do campo). */
  dimensionLabels?: Record<string, string>;
  /** Coluna de agrupamento adicional, usada em tabelas (multi-coluna). */
  secondaryDimension?: string;
  metrics: MetricSpec[];
  filters: WidgetFilter[];
  orderBy?: { field: string; direction: "asc" | "desc" };
  dateRange: WidgetDateRange;
  /** Agrupamento temporal da dimensão de data (padrão: mês). */
  dateGranularity?: DateGranularity;
  limit?: number;
  /** Formato de exibição (apenas KPI). Padrão: number. */
  kpiFormat?: KpiFormat;
  /**
   * KPI calculado por divisão genérica: valor = (operando do numerador) ÷
   * (operando do denominador). Cada operando tem sua própria métrica
   * (op + coluna) e filtros opcionais. Funciona para qualquer dado, ex.:
   * soma(Receita) ÷ contagem(pedidos) = ticket médio; ou
   * contagem(Status=ganho) ÷ contagem(total) × 100 = taxa de conversão.
   */
  kpiRatio?: KpiRatioConfig;
  /** Compara o valor com um período escolhido pelo usuário. */
  compare?: KpiCompareConfig;
  /** Preset legado Kommo — usado enquanto coorte não é query genérica */
  preset?: WidgetQueryPreset;
};

/** Um lado da divisão de um KPI: uma métrica agregada sobre um subconjunto. */
export type KpiOperand = {
  metric: MetricSpec;
  /** Filtros opcionais que restringem os registros deste operando. */
  filters: WidgetFilter[];
};

export type KpiRatioConfig = {
  enabled: boolean;
  numerator: KpiOperand;
  denominator: KpiOperand;
  /** Multiplica por 100 e exibe com "%". */
  asPercent: boolean;
};

export const DEFAULT_KPI_OPERAND: KpiOperand = { metric: { op: "count" }, filters: [] };

/** Normaliza um operando (tolera formato legado/ausente). */
export function normalizeKpiOperand(value: unknown): KpiOperand {
  if (Array.isArray(value)) {
    // Formato legado: era apenas uma lista de filtros sobre count(*).
    return { metric: { op: "count" }, filters: value as WidgetFilter[] };
  }
  const o = value as Partial<KpiOperand> | undefined;
  return {
    metric: o?.metric ?? { op: "count" },
    filters: Array.isArray(o?.filters) ? o!.filters! : [],
  };
}

export type KpiCompareConfig = {
  enabled: boolean;
  /** Início do período de comparação (ISO yyyy-mm-dd). */
  from?: string;
  /** Fim do período de comparação (ISO yyyy-mm-dd). */
  to?: string;
};

export const EMPTY_WIDGET_QUERY: WidgetQueryConfig = {
  source: null,
  dimensions: [],
  metrics: [],
  filters: [],
  dateRange: { mode: "inherit" },
};

export type DataSourceFieldDef = {
  name: string;
  label: string;
  logicalType: "string" | "number" | "date" | "boolean";
  role: "dimension" | "metric" | "time" | "id";
};

/** Rótulo padrão ou personalizado de uma dimensão (coluna de agrupamento). */
export function getDimensionDisplayLabel(
  name: string,
  customLabels?: Record<string, string>,
  fieldDefs?: DataSourceFieldDef[],
): string {
  if (customLabels?.[name]?.trim()) return customLabels[name].trim();
  return fieldDefs?.find((f) => f.name === name)?.label ?? name;
}

export function getWidgetQueryConfig(widget: DashboardWidget): WidgetQueryConfig {
  const raw = widget.props?.queryConfig as WidgetQueryConfig | undefined;
  if (raw && typeof raw === "object") return raw;
  return migrateLegacyWidgetProps(widget);
}

export function isQueryConfigComplete(config: WidgetQueryConfig): boolean {
  if (!config.source) return false;
  if (config.preset === "cohort") return config.source.kind === "kommo";
  if (config.metrics.length === 0) return false;
  const chartTypes = ["lineChart", "barChart", "areaChart", "pieChart", "rankingTable", "cohortChart"];
  const widgetType = (widget?: DashboardWidget) => widget?.type;
  void widgetType;
  if (config.dimensions.length === 0 && config.metrics.some((m) => m.op !== "count")) {
    // count(*) KPI ok without dimension
    const onlyCount = config.metrics.length === 1 && config.metrics[0]?.op === "count";
    if (!onlyCount) return false;
  }
  return true;
}

export function isQueryReady(config: WidgetQueryConfig, widgetType: string): boolean {
  if (!config.source) return false;

  if (config.preset === "cohort") {
    return widgetType === "cohortTable" || widgetType === "cohortChart";
  }

  if (
    config.preset &&
    ["newLeads", "conversionRate", "appointments", "leadsWonOverTime", "closedByLocation", "closedByOrigin"].includes(
      config.preset,
    )
  ) {
    return true;
  }

  if (config.metrics.length === 0) return false;

  const needsDimension = ["lineChart", "barChart", "areaChart", "pieChart", "rankingTable", "cohortTable"].includes(
    widgetType,
  );
  if (needsDimension && config.dimensions.length === 0) return false;

  return true;
}

export function buildQuerySpec(config: WidgetQueryConfig): QuerySpec {
  const spec: QuerySpec = {
    dimensions: [...config.dimensions],
    metrics: config.metrics.map((m) => ({ ...m })),
    limit: config.limit,
  };
  if (config.orderBy) {
    spec.orderBy = {
      metricAs: config.orderBy.field,
      direction: config.orderBy.direction,
    };
  }
  return spec;
}

const LEGACY_PRESET_MAP: Record<string, WidgetQueryPreset> = {
  newLeads: "newLeads",
  conversionRate: "conversionRate",
  appointments: "appointments",
  leadsWonOverTime: "leadsWonOverTime",
  closedByLocation: "closedByLocation",
  closedByOrigin: "closedByOrigin",
  cohort: "cohort",
};

export function migrateLegacyWidgetProps(widget: DashboardWidget): WidgetQueryConfig {
  const binding = widget.props?.dataBinding as DataBinding | undefined;
  const metricKey = widget.props?.metricKey as string | undefined;
  const chartKey = widget.props?.chartKey as string | undefined;
  const tableKey = widget.props?.tableKey as string | undefined;

  if (binding?.kind === "dataset") {
    return {
      source: { kind: "dataset", datasetId: binding.datasetId },
      dimensions: binding.xKey ? [binding.xKey] : [],
      metrics: [{ op: "sum", column: binding.yKey, as: "value" }],
      filters: [],
      dateRange: { mode: "inherit" },
    };
  }

  if (binding?.kind === "custom") {
    return { ...EMPTY_WIDGET_QUERY, source: null };
  }

  let preset: WidgetQueryPreset | undefined;
  if (binding?.kind === "builtin") {
    preset = LEGACY_PRESET_MAP[binding.key];
  } else if (metricKey) {
    preset = LEGACY_PRESET_MAP[metricKey];
  } else if (chartKey === "leadsWon") {
    preset = "leadsWonOverTime";
  } else if (tableKey === "byOrigin") {
    preset = "closedByOrigin";
  } else if (tableKey === "byLocation") {
    preset = "closedByLocation";
  } else if (widget.type === "cohortTable" || widget.type === "cohortChart") {
    preset = "cohort";
  }

  if (preset) {
    return buildPresetQueryConfig(preset, widget.type);
  }

  return { ...EMPTY_WIDGET_QUERY };
}

export function buildPresetQueryConfig(preset: WidgetQueryPreset, widgetType: string): WidgetQueryConfig {
  const base: WidgetQueryConfig = {
    source: { kind: "kommo" },
    dimensions: [],
    metrics: [],
    filters: [],
    dateRange: { mode: "inherit", field: "Data_Criacao" },
    preset,
  };

  switch (preset) {
    case "cohort":
      return base;
    case "newLeads":
      return {
        ...base,
        metrics: [{ op: "countDistinct", column: "ID", as: "count" }],
        dateRange: { mode: "inherit", field: "Data_Criacao" },
      };
    case "conversionRate":
      return {
        ...base,
        metrics: [{ op: "countDistinct", column: "ID", as: "count" }],
        preset: "conversionRate",
      };
    case "appointments":
      return {
        ...base,
        metrics: [{ op: "countDistinct", column: "ID", as: "count" }],
        preset: "appointments",
      };
    case "leadsWonOverTime":
      return {
        ...base,
        dimensions: ["Data_Fechamento"],
        metrics: [{ op: "countDistinct", column: "ID", as: "count" }],
        dateRange: { mode: "inherit", field: "Data_Fechamento" },
      };
    case "closedByLocation":
      return {
        ...base,
        dimensions: widgetType === "pieChart" ? ["Origem"] : ["Local_da_Consulta"],
        metrics: [{ op: "countDistinct", column: "ID", as: "count" }],
        filters: [{ field: "Status_Nome", operator: "contains", value: "ganh" }],
      };
    case "closedByOrigin":
      return {
        ...base,
        dimensions: ["Origem"],
        metrics: [{ op: "countDistinct", column: "ID", as: "count" }],
      };
    default:
      return base;
  }
}

export function setWidgetQueryConfig(widget: DashboardWidget, config: WidgetQueryConfig): DashboardWidget {
  return {
    ...widget,
    props: { ...(widget.props ?? {}), queryConfig: config },
  };
}
