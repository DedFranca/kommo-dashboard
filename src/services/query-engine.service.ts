import { buildPayloadForWidget } from "@/lib/analytics/build/recharts";
import { aggregateTable } from "@/lib/analytics/aggregate/group-by";
import { bucketDateValue, looksLikeDateColumn } from "@/lib/analytics/aggregate/time-bucket";
import { DEFAULT_DATE_RANGE, endOfDay, parseISODate } from "@/lib/date-range";
import type { DateRange } from "@/lib/date-range";
import { KOMMO_FIELD_DEFINITIONS } from "@/lib/kommo/fields";
import { getRawDataset } from "@/services/analytics-datasets.service";
import type { KommoClientConfig } from "@/lib/kommo/client";
import { fetchKommoRawTable, filterRawTable } from "@/services/kommo-table.service";
import { getWidgetPresetMetrics } from "@/services/widget-preset-kommo.service";
import { getDashboardExtras } from "@/services/data-source.service";
import type { ChartKind, MetricSpec, RawTable } from "@/types/analytics";
import { getMetricDisplayLabel } from "@/types/analytics";
import type { CustomDataPayload, KpiPayload, TablePayload } from "@/types/data-source";
import type { DataSourceFieldDef, WidgetFilter, WidgetQueryConfig } from "@/types/widget-query";
import { buildQuerySpec, getDimensionDisplayLabel, normalizeKpiOperand } from "@/types/widget-query";

function metricKeyOf(m: MetricSpec, idx = 0): string {
  return m.as ?? (m.op === "count" ? "count" : `${m.op}_${m.column ?? idx}`);
}

function metricLabelOf(m: MetricSpec): string {
  return getMetricDisplayLabel(m);
}

function dimensionLabelOf(
  name: string,
  fieldDefs?: DataSourceFieldDef[],
  customLabels?: Record<string, string>,
): string {
  return getDimensionDisplayLabel(name, customLabels, fieldDefs);
}

/** Agrega uma única métrica sobre toda a tabela (sem dimensões). */
function aggregateScalar(table: RawTable, metric: MetricSpec): number {
  const rows = aggregateTable(table, { dimensions: [], metrics: [metric] });
  return Number(rows[0]?.[metricKeyOf(metric)] ?? 0);
}

function formatRangeLabel(from?: string, to?: string): string {
  const fmt = (s?: string) => {
    if (!s) return "?";
    const parts = s.slice(0, 10).split("-");
    return parts.length === 3 ? `${parts[2]}/${parts[1]}/${parts[0]}` : s;
  };
  return `${fmt(from)} – ${fmt(to)}`;
}

function buildKpiPayload(params: {
  config: WidgetQueryConfig;
  table: RawTable;
  filtered: RawTable;
  globalRange: DateRange;
  defaultDateField: string | null;
}): KpiPayload {
  const { config, table, filtered, globalRange, defaultDateField } = params;
  const metric = config.metrics[0] ?? { op: "count" as const, as: "value" };
  const dateField = config.dateRange.field ?? defaultDateField;
  const ratio = config.kpiRatio;
  const numerator = ratio?.enabled ? normalizeKpiOperand(ratio.numerator) : null;
  const denominator = ratio?.enabled ? normalizeKpiOperand(ratio.denominator) : null;

  // Aplica apenas filtros (sem janela de data) sobre uma tabela já recortada.
  const applyFilters = (t: RawTable, filters: WidgetFilter[]): RawTable =>
    filters.length ? filterRawTable(t, filters, { mode: "custom" }, globalRange, null) : t;

  // Calcula o valor do KPI sobre uma tabela já filtrada por período.
  const computeValue = (base: RawTable): number => {
    if (ratio?.enabled && numerator && denominator) {
      const num = aggregateScalar(applyFilters(base, numerator.filters), numerator.metric);
      const den = aggregateScalar(applyFilters(base, denominator.filters), denominator.metric);
      const v = den !== 0 ? num / den : 0;
      return ratio.asPercent ? v * 100 : v;
    }
    return aggregateScalar(base, metric);
  };

  const value = computeValue(filtered);
  const format: KpiPayload["format"] = ratio?.enabled
    ? ratio.asPercent
      ? "percent"
      : config.kpiFormat ?? "number"
    : config.kpiFormat ?? "number";

  const payload: KpiPayload = { value, format };

  // Comparativo com um período escolhido pelo usuário.
  if (config.compare?.enabled && dateField && config.compare.from && config.compare.to) {
    const compareRange = {
      mode: "custom" as const,
      field: dateField,
      from: config.compare.from,
      to: config.compare.to,
    };
    const prevFiltered = filterRawTable(table, config.filters, compareRange, globalRange, defaultDateField);
    const prevValue = computeValue(prevFiltered);

    const pct = prevValue !== 0 ? ((value - prevValue) / Math.abs(prevValue)) * 100 : null;
    const direction = value > prevValue ? "up" : value < prevValue ? "down" : "flat";
    payload.delta = {
      pct,
      previous: prevValue,
      direction,
      label: `vs. ${formatRangeLabel(config.compare.from, config.compare.to)}`,
    };
  }

  return payload;
}

function buildTablePayload(
  table: RawTable,
  config: WidgetQueryConfig,
  spec: { metrics: MetricSpec[]; orderBy?: { metricAs?: string; direction: "asc" | "desc" }; limit?: number },
  fieldDefs?: DataSourceFieldDef[],
): TablePayload {
  const dims = [config.dimensions[0], config.secondaryDimension].filter((d): d is string => Boolean(d));
  const metrics = spec.metrics.length ? spec.metrics : [{ op: "count" as const, as: "value" }];

  const rows = aggregateTable(table, {
    dimensions: dims,
    metrics,
    orderBy: spec.orderBy,
    limit: spec.limit,
  });

  const columns = [
    ...dims.map((d) => ({
      key: d,
      label: dimensionLabelOf(d, fieldDefs, config.dimensionLabels),
      numeric: false,
    })),
    ...metrics.map((m, i) => ({ key: metricKeyOf(m, i), label: metricLabelOf(m), numeric: true })),
  ];

  return { columns, rows };
}

const CATEGORY_DEFAULT_LIMIT = 12;

export type QueryEngineInput = {
  userId: string;
  widgetType: ChartKind | "cohortTable" | "cohortChart";
  queryConfig: WidgetQueryConfig;
  globalDateRange?: DateRange;
  bustCache?: boolean;
  kommoConfig?: KommoClientConfig | null;
  /** Dono dos datasets CSV/Sheets (criador do layout compartilhado). */
  datasetOwnerId?: string | null;
};

export type QueryEngineResult =
  | { ok: true; payload: CustomDataPayload | { cohort: unknown }; querySpec?: unknown }
  | { ok: false; error: string; empty?: boolean };

async function loadTable(
  userId: string,
  config: WidgetQueryConfig,
  bustCache?: boolean,
  kommoConfig?: KommoClientConfig | null,
  datasetOwnerId?: string | null,
): Promise<RawTable | null> {
  if (!config.source) return null;

  if (config.source.kind === "kommo") {
    if (!kommoConfig) return null;
    return fetchKommoRawTable({ bustCache, config: kommoConfig });
  }

  if (config.source.kind === "dataset") {
    const datasetUserId = datasetOwnerId ?? userId;
    const ds = await getRawDataset(datasetUserId, config.source.datasetId);
    if (!ds) return null;
    return ds.rawTable as unknown as RawTable;
  }

  return null;
}

export async function executeWidgetQuery(input: QueryEngineInput): Promise<QueryEngineResult> {
  const { userId, widgetType, queryConfig, bustCache } = input;

  if (!queryConfig.source) {
    return { ok: false, error: "Nenhuma fonte de dados conectada", empty: true };
  }

  if (queryConfig.source.kind === "google_sheets") {
    return { ok: false, error: "Google Sheets estará disponível em breve", empty: true };
  }

  if (queryConfig.source.kind === "kommo" && !input.kommoConfig) {
    return { ok: false, error: "Kommo não configurado para esta conta", empty: true };
  }

  const globalRange: DateRange = input.globalDateRange ?? DEFAULT_DATE_RANGE;

  // Presets Kommo legados (coorte, conversão agregada)
  if (queryConfig.preset === "cohort") {
    const extras = await getDashboardExtras(userId);
    const metrics = await getWidgetPresetMetrics(userId, extras.settings, globalRange, { bustCache });
    return { ok: true, payload: { cohort: { rows: metrics.cohort, total: metrics.cohortTotal } } };
  }

  if (queryConfig.preset === "conversionRate") {
    const extras = await getDashboardExtras(userId);
    const metrics = await getWidgetPresetMetrics(userId, extras.settings, globalRange, { bustCache });
    return { ok: true, payload: { value: metrics.conversionRate, format: "percent" } };
  }

  if (queryConfig.preset === "newLeads") {
    const extras = await getDashboardExtras(userId);
    const metrics = await getWidgetPresetMetrics(userId, extras.settings, globalRange, { bustCache });
    return { ok: true, payload: { value: metrics.newLeads, format: "number" } };
  }

  if (queryConfig.preset === "appointments") {
    const extras = await getDashboardExtras(userId);
    const metrics = await getWidgetPresetMetrics(userId, extras.settings, globalRange, { bustCache });
    return { ok: true, payload: { value: metrics.appointments, format: "number" } };
  }

  if (queryConfig.preset === "leadsWonOverTime") {
    const extras = await getDashboardExtras(userId);
    const metrics = await getWidgetPresetMetrics(userId, extras.settings, globalRange, { bustCache });
    return { ok: true, payload: { data: metrics.leadsWonOverTime, subtitle: "Leads ganhos no período" } };
  }

  if (queryConfig.preset === "closedByLocation") {
    const extras = await getDashboardExtras(userId);
    const metrics = await getWidgetPresetMetrics(userId, extras.settings, globalRange, { bustCache });
    return {
      ok: true,
      payload: {
        rows: metrics.closedByLocation,
        primaryLabel: "Local",
        secondaryLabel: "Médico",
      },
    };
  }

  if (queryConfig.preset === "closedByOrigin") {
    const extras = await getDashboardExtras(userId);
    const metrics = await getWidgetPresetMetrics(userId, extras.settings, globalRange, { bustCache });
    return {
      ok: true,
      payload: {
        rows: metrics.closedByOrigin,
        primaryLabel: "Origem",
        secondaryLabel: "Local",
      },
    };
  }

  const table = await loadTable(userId, queryConfig, bustCache, input.kommoConfig, input.datasetOwnerId);
  if (!table || !table.rows.length) {
    return { ok: false, error: "Nenhum dado disponível na fonte selecionada", empty: true };
  }

  const defaultDateField = queryConfig.source.kind === "kommo" ? "Data_Criacao" : null;
  const filtered = filterRawTable(
    table,
    queryConfig.filters,
    queryConfig.dateRange,
    globalRange,
    defaultDateField,
  );
  if (!filtered.rows.length) {
    return { ok: false, error: "Nenhum registro corresponde aos filtros", empty: true };
  }

  const spec = buildQuerySpec(queryConfig);

  const chartType =
    widgetType === "cohortTable" || widgetType === "cohortChart"
      ? "rankingTable"
      : (widgetType as ChartKind);

  if (!spec.metrics.length) {
    return { ok: false, error: "Selecione ao menos uma métrica", empty: true };
  }

  // KPI: valor único, com suporte a taxa (% do total) e comparativo de período.
  if (chartType === "kpi") {
    return {
      ok: true,
      payload: buildKpiPayload({
        config: queryConfig,
        table,
        filtered,
        globalRange,
        defaultDateField,
      }),
      querySpec: spec,
    };
  }

  // Pós-processamento da dimensão: agrupar datas por período e aplicar top-N
  // em categorias, evitando gráficos ilegíveis (centenas de pontos/fatias).
  let workingTable = filtered;
  const dim = queryConfig.dimensions[0];

  if (dim) {
    const isTime = await dimensionIsTime(userId, queryConfig, dim, filtered);

    if (isTime) {
      const granularity = queryConfig.dateGranularity ?? "month";
      const rows = filtered.rows
        .map((r) => {
          const bucket = bucketDateValue(r[dim] ?? null, granularity);
          return bucket === null ? null : { ...r, [dim]: bucket };
        })
        .filter((r): r is Record<string, string | null> => r !== null)
        .sort((a, b) => String(a[dim] ?? "").localeCompare(String(b[dim] ?? "")));
      workingTable = { columns: filtered.columns, rows };
      if (chartType !== "rankingTable") {
        spec.orderBy = undefined;
        spec.limit = undefined;
      }
    } else {
      if (!queryConfig.orderBy) {
        spec.orderBy = { metricAs: firstMetricAs(spec), direction: "desc" };
      }
      if (queryConfig.limit == null) {
        spec.limit = CATEGORY_DEFAULT_LIMIT;
      }
    }
  }

  // Tabela: multi-coluna (dimensão primária + secundária opcional + métricas).
  if (chartType === "rankingTable") {
    const fieldDefs = await getSourceFieldDefs(userId, queryConfig);
    return { ok: true, payload: buildTablePayload(workingTable, queryConfig, spec, fieldDefs), querySpec: spec };
  }

  const payload = buildPayloadForWidget({
    widgetType: chartType,
    table: workingTable,
    spec,
  });

  return { ok: true, payload, querySpec: spec };
}

function firstMetricAs(spec: { metrics: { op: string; column?: string; as?: string }[] }): string {
  const m = spec.metrics[0];
  if (!m) return "count";
  return m.as ?? (m.op === "count" ? "count" : `${m.op}_${m.column ?? "v"}`);
}

async function getSourceFieldDefs(
  userId: string,
  config: WidgetQueryConfig,
): Promise<DataSourceFieldDef[]> {
  if (config.source?.kind === "kommo") return KOMMO_FIELD_DEFINITIONS;
  if (config.source?.kind === "dataset") {
    return (await getDatasetFields(userId, config.source.datasetId)) ?? [];
  }
  return [];
}

async function dimensionIsTime(
  userId: string,
  config: WidgetQueryConfig,
  dim: string,
  table: RawTable,
): Promise<boolean> {
  const defs = await getSourceFieldDefs(userId, config);
  const def = defs.find((d) => d.name === dim);
  if (def) return def.role === "time" || def.logicalType === "date";
  return looksLikeDateColumn(table.rows.map((r) => r[dim] ?? null));
}

/** Preview de campos de um dataset CSV importado. */
export async function getDatasetFields(userId: string, datasetId: string) {
  const ds = await getRawDataset(userId, datasetId);
  if (!ds) return null;
  const schema = ds.inferredSchema as { columns?: { name: string; logicalType: string }[] };
  const semantic = ds.semanticMap as { columns?: { name: string; role: string }[] };
  const semMap = new Map((semantic.columns ?? []).map((c) => [c.name, c.role]));

  return (schema.columns ?? []).map((col) => ({
    name: col.name,
    label: col.name,
    logicalType: col.logicalType as "string" | "number" | "date" | "boolean",
    role: (semMap.get(col.name) ?? "dimension") as "dimension" | "metric" | "time" | "id",
  }));
}

export function parseGlobalDateRange(from?: string, to?: string): DateRange {
  const fromDate = parseISODate(from) ?? DEFAULT_DATE_RANGE.from;
  const toDate = parseISODate(to) ?? DEFAULT_DATE_RANGE.to;
  return { from: fromDate, to: endOfDay(toDate) };
}
