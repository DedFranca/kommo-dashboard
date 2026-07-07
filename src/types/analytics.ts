export type LogicalType = "number" | "date" | "boolean" | "string";

export type RawTable = {
  columns: string[];
  rows: Record<string, string | null>[];
};

export type InferredNumberStats = {
  min: number | null;
  max: number | null;
  mean: number | null;
};

export type InferredDateStats = {
  min: string | null; // ISO string
  max: string | null; // ISO string
};

export type InferredColumn = {
  name: string;
  logicalType: LogicalType;
  nullablePct: number; // 0..100
  cardinality: number;
  numberStats?: InferredNumberStats;
  dateStats?: InferredDateStats;
};

export type InferredSchema = {
  rowCount: number;
  columns: InferredColumn[];
};

export type SemanticRole = "dimension" | "metric" | "time" | "id" | "unknown";

export type SemanticColumn = {
  name: string;
  role: SemanticRole;
  confidence: number; // 0..1
  hints?: string[];
};

export type SemanticMap = {
  columns: SemanticColumn[];
};

export type MetricOp = "count" | "countDistinct" | "sum" | "avg" | "min" | "max";

export type MetricSpec = {
  op: MetricOp;
  column?: string; // not needed for count(*)
  as?: string;
  /** Rótulo exibido na coluna do gráfico/tabela (independente da chave `as`). */
  label?: string;
};

const METRIC_OP_LABELS: Record<MetricOp, string> = {
  count: "Contagem",
  countDistinct: "Distintos",
  sum: "Soma",
  avg: "Média",
  min: "Mínimo",
  max: "Máximo",
};

/** Rótulo padrão ou personalizado de uma métrica agregada. */
export function getMetricDisplayLabel(m: MetricSpec): string {
  if (m.label?.trim()) return m.label.trim();
  const op = METRIC_OP_LABELS[m.op] ?? m.op;
  return m.op === "count" ? "Contagem" : `${op} de ${m.column ?? "?"}`;
}

export type QuerySpec = {
  dimensions: string[];
  metrics: MetricSpec[];
  limit?: number; // top N
  orderBy?: { metricAs?: string; direction: "asc" | "desc" };
};

export type ChartKind = "kpi" | "lineChart" | "barChart" | "areaChart" | "pieChart" | "rankingTable";

export type ChartRecommendation = {
  widgetType: ChartKind;
  rationale: string;
  suggestedQuery: QuerySpec;
};

