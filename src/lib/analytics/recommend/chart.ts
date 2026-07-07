import type { ChartKind, ChartRecommendation, InferredSchema, QuerySpec, SemanticMap } from "@/types/analytics";

function pickColumns(semantic: SemanticMap, schema: InferredSchema) {
  const role = (r: string) => semantic.columns.filter((c) => c.role === r).map((c) => c.name);
  const dimensions = role("dimension");
  const metrics = role("metric");
  const times = role("time");

  // If semantic tagging missed, fall back by type
  const schemaDates = schema.columns.filter((c) => c.logicalType === "date").map((c) => c.name);
  const schemaNumbers = schema.columns.filter((c) => c.logicalType === "number").map((c) => c.name);
  const schemaStrings = schema.columns.filter((c) => c.logicalType === "string").map((c) => c.name);

  return {
    time: times[0] ?? schemaDates[0] ?? null,
    dimension: dimensions[0] ?? schemaStrings[0] ?? null,
    metric: metrics[0] ?? schemaNumbers[0] ?? null,
  };
}

function defaultMetric(metricCol: string | null): QuerySpec["metrics"] {
  if (metricCol) return [{ op: "sum", column: metricCol, as: "v" }];
  return [{ op: "count", as: "v" }];
}

export function recommendChart(params: {
  widgetTypeHint?: ChartKind;
  inferredSchema: InferredSchema;
  semanticMap: SemanticMap;
}): ChartRecommendation {
  const picked = pickColumns(params.semanticMap, params.inferredSchema);

  const hasTime = Boolean(picked.time);
  const hasMetric = Boolean(picked.metric);
  const dim = picked.dimension;

  const suggestedQuery: QuerySpec = {
    dimensions: [],
    metrics: defaultMetric(picked.metric),
    orderBy: { metricAs: "v", direction: "desc" },
    limit: 50,
  };

  let widgetType: ChartKind = params.widgetTypeHint ?? "barChart";
  let rationale = "Sugestão baseada nos tipos e headers do arquivo.";

  if (hasTime) {
    widgetType = params.widgetTypeHint && ["lineChart", "areaChart", "barChart"].includes(params.widgetTypeHint)
      ? params.widgetTypeHint
      : "lineChart";
    suggestedQuery.dimensions = [picked.time!];
    suggestedQuery.orderBy = { metricAs: "v", direction: "asc" };
    suggestedQuery.limit = 500;
    rationale = "Detectei uma coluna de tempo; gráficos de linha/área funcionam melhor para séries temporais.";
  } else if (dim) {
    suggestedQuery.dimensions = [dim];
    widgetType = params.widgetTypeHint ?? "barChart";
    const dimCol = params.inferredSchema.columns.find((c) => c.name === dim);
    if (dimCol && dimCol.cardinality > 0 && dimCol.cardinality <= 6) {
      widgetType = params.widgetTypeHint ?? "pieChart";
      rationale = "Uma dimensão com poucas categorias tende a funcionar bem como pizza; barras também é uma opção.";
    } else {
      widgetType = params.widgetTypeHint ?? "barChart";
      rationale = "Uma dimensão + uma métrica tende a funcionar bem como barras (ranking).";
    }
  } else {
    widgetType = params.widgetTypeHint ?? "kpi";
    suggestedQuery.dimensions = [];
    suggestedQuery.metrics = [{ op: "count", as: "v" }];
    suggestedQuery.orderBy = undefined;
    suggestedQuery.limit = undefined;
    rationale = "Não encontrei uma dimensão clara; sugeri KPI (contagem total).";
  }

  // If widget type is fixed by UI, keep it but keep query sane.
  if (params.widgetTypeHint) widgetType = params.widgetTypeHint;

  // KPI always aggregates to single value
  if (widgetType === "kpi") {
    suggestedQuery.dimensions = [];
    suggestedQuery.orderBy = undefined;
    suggestedQuery.limit = undefined;
    if (!hasMetric) suggestedQuery.metrics = [{ op: "count", as: "v" }];
  }

  return { widgetType, rationale, suggestedQuery };
}

