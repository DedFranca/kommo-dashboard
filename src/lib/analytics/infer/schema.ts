import type { InferredColumn, InferredSchema, LogicalType, RawTable } from "@/types/analytics";

type InferOptions = {
  sampleSize?: number;
};

const PTBR_DATE_PATTERNS: RegExp[] = [
  /^\d{4}-\d{2}-\d{2}$/, // 2026-05-27
  /^\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}(:\d{2})?(\.\d+)?(Z|[+-]\d{2}:\d{2})?$/, // ISO-ish
  /^\d{2}\/\d{2}\/\d{4}$/, // 27/05/2026
  /^\d{2}\/\d{2}\/\d{4}[ T]\d{2}:\d{2}(:\d{2})?$/, // 27/05/2026 10:30
];

function parsePtBrNumber(v: string): number | null {
  const s = v.trim();
  if (!s) return null;
  // remove currency and spaces
  const cleaned = s.replace(/[R$\s]/g, "");
  // 1.234,56 -> 1234.56 ; 1234,56 -> 1234.56
  const normalized = cleaned.includes(",") && cleaned.includes(".")
    ? cleaned.replace(/\./g, "").replace(",", ".")
    : cleaned.replace(",", ".");
  const n = Number(normalized);
  return Number.isFinite(n) ? n : null;
}

function parseBool(v: string): boolean | null {
  const s = v.trim().toLowerCase();
  if (["true", "t", "1", "sim", "yes", "y"].includes(s)) return true;
  if (["false", "f", "0", "nao", "não", "no", "n"].includes(s)) return false;
  return null;
}

function parseDate(v: string): Date | null {
  const s = v.trim();
  if (!s) return null;
  if (!PTBR_DATE_PATTERNS.some((r) => r.test(s))) return null;
  // Prefer parsing dd/MM/yyyy ourselves
  const m = s.match(/^(\d{2})\/(\d{2})\/(\d{4})(?:[ T](\d{2}):(\d{2})(?::(\d{2}))?)?$/);
  if (m) {
    const dd = Number(m[1]);
    const mm = Number(m[2]);
    const yyyy = Number(m[3]);
    const hh = m[4] ? Number(m[4]) : 0;
    const min = m[5] ? Number(m[5]) : 0;
    const ss = m[6] ? Number(m[6]) : 0;
    const d = new Date(Date.UTC(yyyy, mm - 1, dd, hh, min, ss));
    return Number.isNaN(d.getTime()) ? null : d;
  }
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? null : d;
}

function logicalTypeFromCounts(counts: Record<LogicalType, number>): LogicalType {
  // number > date > boolean > string (string is fallback)
  if (counts.number > 0 && counts.number >= counts.date && counts.number >= counts.boolean) return "number";
  if (counts.date > 0 && counts.date >= counts.boolean) return "date";
  if (counts.boolean > 0) return "boolean";
  return "string";
}

export function inferSchema(table: RawTable, opts: InferOptions = {}): InferredSchema {
  const sampleSize = opts.sampleSize ?? 2000;
  const rows = table.rows.slice(0, sampleSize);

  const columns: InferredColumn[] = table.columns.map((col) => {
    let nulls = 0;
    const uniques = new Set<string>();
    const typeCounts: Record<LogicalType, number> = { number: 0, date: 0, boolean: 0, string: 0 };

    let minN: number | null = null;
    let maxN: number | null = null;
    let sumN = 0;
    let countN = 0;

    let minD: Date | null = null;
    let maxD: Date | null = null;

    for (const r of rows) {
      const raw = r[col];
      if (raw === null || raw === undefined || raw === "") {
        nulls++;
        continue;
      }
      const v = String(raw);
      uniques.add(v);

      const bn = parseBool(v);
      if (bn !== null) {
        typeCounts.boolean++;
        continue;
      }

      const dn = parseDate(v);
      if (dn) {
        typeCounts.date++;
        if (!minD || dn < minD) minD = dn;
        if (!maxD || dn > maxD) maxD = dn;
        continue;
      }

      const nn = parsePtBrNumber(v);
      if (nn !== null) {
        typeCounts.number++;
        countN++;
        sumN += nn;
        if (minN === null || nn < minN) minN = nn;
        if (maxN === null || nn > maxN) maxN = nn;
        continue;
      }

      typeCounts.string++;
    }

    const logicalType = logicalTypeFromCounts(typeCounts);
    const total = rows.length || 1;
    const nullablePct = (nulls / total) * 100;
    const base: InferredColumn = { name: col, logicalType, nullablePct, cardinality: uniques.size };

    if (logicalType === "number") {
      base.numberStats = { min: minN, max: maxN, mean: countN ? sumN / countN : null };
    }
    if (logicalType === "date") {
      base.dateStats = { min: minD ? minD.toISOString() : null, max: maxD ? maxD.toISOString() : null };
    }

    return base;
  });

  return { rowCount: table.rows.length, columns };
}

