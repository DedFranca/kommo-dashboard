import type { InferredSchema, SemanticColumn, SemanticMap, SemanticRole } from "@/types/analytics";

function norm(s: string) {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .trim();
}

function scoreHeader(name: string, patterns: RegExp[]): number {
  const n = norm(name);
  for (const p of patterns) {
    if (p.test(n)) return 1;
  }
  return 0;
}

const rolePatterns: Record<Exclude<SemanticRole, "unknown">, RegExp[]> = {
  id: [/^id$/, /_id$/, /^uuid$/, /^codigo$/, /^c[oó]digo$/],
  time: [/data/, /date/, /created_?at/, /updated_?at/, /mes/, /m[eê]s/, /ano/, /day/, /week/],
  metric: [/valor/, /value/, /amount/, /total/, /receita/, /revenue/, /quant/, /qtd/, /count/, /numero/, /n[uú]mero/],
  dimension: [/empresa/, /company/, /cliente/, /client/, /origem/, /origin/, /local/, /location/, /status/, /stage/, /pipeline/, /categoria/, /category/],
};

function chooseRole(scores: Record<SemanticRole, number>): { role: SemanticRole; confidence: number } {
  const entries = Object.entries(scores) as [SemanticRole, number][];
  entries.sort((a, b) => b[1] - a[1]);
  const best = entries[0] ?? ["unknown", 0];
  const second = entries[1] ?? ["unknown", 0];
  const confidence = best[1] === 0 ? 0 : best[1] - second[1] >= 0.5 ? 0.9 : 0.6;
  return { role: best[1] === 0 ? "unknown" : best[0], confidence };
}

export function inferSemanticMap(schema: InferredSchema): SemanticMap {
  const columns: SemanticColumn[] = schema.columns.map((c) => {
    const scores: Record<SemanticRole, number> = { id: 0, time: 0, metric: 0, dimension: 0, unknown: 0 };
    scores.id = scoreHeader(c.name, rolePatterns.id);
    scores.time = scoreHeader(c.name, rolePatterns.time);
    scores.metric = scoreHeader(c.name, rolePatterns.metric);
    scores.dimension = scoreHeader(c.name, rolePatterns.dimension);

    // Type-based nudges
    if (c.logicalType === "date") scores.time = Math.max(scores.time, 0.8);
    if (c.logicalType === "number") scores.metric = Math.max(scores.metric, 0.7);

    // High-cardinality string-ish columns are likely IDs, low-cardinality strings are likely dimensions
    if (c.logicalType === "string") {
      if (c.cardinality > 0 && c.cardinality / Math.max(schema.rowCount, 1) > 0.8) {
        scores.id = Math.max(scores.id, 0.6);
      } else {
        scores.dimension = Math.max(scores.dimension, 0.6);
      }
    }

    const { role, confidence } = chooseRole(scores);

    const hints: string[] = [];
    if (role === "metric" && c.logicalType !== "number") hints.push("Header sugere métrica, mas tipo não parece numérico.");
    if (role === "time" && c.logicalType !== "date") hints.push("Header sugere tempo, mas tipo não parece data.");

    return { name: c.name, role, confidence, hints: hints.length ? hints : undefined };
  });

  return { columns };
}

