import type { MetricOp, MetricSpec, QuerySpec, RawTable } from "@/types/analytics";
import { KOMMO_LEAD_ID_FIELD, getKommoLeadIdFromRow } from "@/lib/kommo/lead-dedupe";

type AggRow = Record<string, string | number | null>;

function getKey(row: Record<string, string | null>, dims: string[]): string {
  return dims.map((d) => row[d] ?? "∅").join("||");
}

function parseNumberMaybe(v: unknown): number | null {
  if (v === null || v === undefined) return null;
  const s = String(v).trim();
  if (!s) return null;
  const cleaned = s.replace(/[R$\s]/g, "");
  const normalized =
    cleaned.includes(",") && cleaned.includes(".") ? cleaned.replace(/\./g, "").replace(",", ".") : cleaned.replace(",", ".");
  const n = Number(normalized);
  return Number.isFinite(n) ? n : null;
}

type ReducerState =
  | { op: "count"; n: number }
  | { op: "countDistinct"; set: Set<string> }
  | { op: "sum"; sum: number }
  | { op: "avg"; sum: number; n: number }
  | { op: "min"; v: number | null }
  | { op: "max"; v: number | null };

function initReducer(m: MetricSpec, countDistinctId: boolean): ReducerState {
  switch (m.op) {
    case "count":
      if (countDistinctId) return { op: "countDistinct", set: new Set<string>() };
      return { op: "count", n: 0 };
    case "countDistinct":
      return { op: "countDistinct", set: new Set<string>() };
    case "sum":
      return { op: "sum", sum: 0 };
    case "avg":
      return { op: "avg", sum: 0, n: 0 };
    case "min":
      return { op: "min", v: null };
    case "max":
      return { op: "max", v: null };
    default: {
      const _exhaustive: never = m.op;
      return _exhaustive;
    }
  }
}

function addToReducer(state: ReducerState, row: Record<string, string | null>, metric: MetricSpec) {
  const col = metric.column;
  const raw = col ? row[col] : null;
  switch (state.op) {
    case "count":
      state.n++;
      return;
    case "countDistinct": {
      if (!col) {
        const id = getKommoLeadIdFromRow(row);
        if (id) state.set.add(id);
        return;
      }
      if (raw === null || raw === undefined || raw === "") return;
      state.set.add(String(raw));
      return;
    }
    case "sum": {
      if (!col) return;
      const n = parseNumberMaybe(raw);
      if (n === null) return;
      state.sum += n;
      return;
    }
    case "avg": {
      if (!col) return;
      const n = parseNumberMaybe(raw);
      if (n === null) return;
      state.sum += n;
      state.n++;
      return;
    }
    case "min": {
      if (!col) return;
      const n = parseNumberMaybe(raw);
      if (n === null) return;
      state.v = state.v === null ? n : Math.min(state.v, n);
      return;
    }
    case "max": {
      if (!col) return;
      const n = parseNumberMaybe(raw);
      if (n === null) return;
      state.v = state.v === null ? n : Math.max(state.v, n);
      return;
    }
  }
}

function finalizeReducer(state: ReducerState): number {
  switch (state.op) {
    case "count":
      return state.n;
    case "countDistinct":
      return state.set.size;
    case "sum":
      return state.sum;
    case "avg":
      return state.n ? state.sum / state.n : 0;
    case "min":
      return state.v ?? 0;
    case "max":
      return state.v ?? 0;
  }
}

export function aggregateTable(table: RawTable, spec: QuerySpec): AggRow[] {
  const dims = spec.dimensions ?? [];
  const metrics = spec.metrics ?? [{ op: "count" as MetricOp }];
  const hasLeadId = table.columns.includes(KOMMO_LEAD_ID_FIELD);

  const metricAs = (m: MetricSpec, idx: number) => m.as ?? (m.op === "count" ? "count" : `${m.op}_${m.column ?? idx}`);

  const groups = new Map<
    string,
    {
      dims: Record<string, string | null>;
      reducers: ReducerState[];
    }
  >();

  const countDistinctIdFor = (m: MetricSpec) => hasLeadId && m.op === "count" && !m.column;

  for (const row of table.rows) {
    const key = getKey(row, dims);
    const existing = groups.get(key);
    const g =
      existing ??
      (() => {
        const d: Record<string, string | null> = {};
        for (const dim of dims) d[dim] = row[dim] ?? null;
        const r = metrics.map((m) => initReducer(m, countDistinctIdFor(m)));
        const v = { dims: d, reducers: r };
        groups.set(key, v);
        return v;
      })();

    for (let i = 0; i < metrics.length; i++) {
      addToReducer(g.reducers[i]!, row, metrics[i]!);
    }
  }

  let out: AggRow[] = Array.from(groups.values()).map((g) => {
    const r: AggRow = {};
    for (const dim of dims) r[dim] = g.dims[dim] ?? null;
    for (let i = 0; i < metrics.length; i++) {
      r[metricAs(metrics[i]!, i)] = finalizeReducer(g.reducers[i]!);
    }
    return r;
  });

  if (spec.orderBy?.metricAs) {
    const k = spec.orderBy.metricAs;
    const dir = spec.orderBy.direction;
    out = out.sort((a, b) => {
      const av = Number(a[k] ?? 0);
      const bv = Number(b[k] ?? 0);
      return dir === "asc" ? av - bv : bv - av;
    });
  }

  if (spec.limit && spec.limit > 0) out = out.slice(0, spec.limit);
  return out;
}

