/**
 * Engine de expressões para campos calculados.
 * Suporta operações aritméticas básicas e referências a colunas.
 *
 * Exemplos:
 *   conversion_rate = won / total * 100
 *   revenue_per_lead = revenue / leads
 *   roi = (revenue - cost) / cost * 100
 */

export type ExpressionContext = Record<string, number | string | null | undefined>;

export type ExpressionResult =
  | { ok: true; value: number }
  | { ok: false; error: string };

const SAFE_PATTERN = /^[\d\s+\-*/().%a-zA-Z_]+$/;

/** Substitui identificadores de coluna por valores numéricos do contexto. */
function substituteVariables(expression: string, context: ExpressionContext): string {
  return expression.replace(/[a-zA-Z_][a-zA-Z0-9_]*/g, (ident) => {
    if (ident in context) {
      const val = context[ident];
      if (val === null || val === undefined) return "0";
      if (typeof val === "number") return String(val);
      const parsed = Number(val);
      return Number.isFinite(parsed) ? String(parsed) : "0";
    }
    return ident;
  });
}

/** Avalia expressão numérica de forma segura (sem eval). */
export function evaluateExpression(expression: string, context: ExpressionContext): ExpressionResult {
  const trimmed = expression.trim();
  if (!trimmed) return { ok: false, error: "Expressão vazia" };
  if (!SAFE_PATTERN.test(trimmed)) {
    return { ok: false, error: "Expressão contém caracteres não permitidos" };
  }

  const substituted = substituteVariables(trimmed, context);

  try {
    // eslint-disable-next-line no-new-func
    const fn = new Function(`"use strict"; return (${substituted});`);
    const result = fn();
    if (typeof result !== "number" || !Number.isFinite(result)) {
      return { ok: false, error: "Resultado não é um número válido" };
    }
    return { ok: true, value: result };
  } catch {
    return { ok: false, error: "Erro ao avaliar expressão" };
  }
}

/** Presets de métricas calculadas comuns. */
export const CALCULATED_FIELD_PRESETS = [
  {
    id: "conversion_rate",
    label: "Taxa de Conversão",
    expression: "won / total * 100",
    resultType: "percent" as const,
  },
  {
    id: "revenue_per_lead",
    label: "Receita por Lead",
    expression: "revenue / leads",
    resultType: "number" as const,
  },
  {
    id: "cac",
    label: "CAC",
    expression: "cost / acquired",
    resultType: "number" as const,
  },
  {
    id: "roi",
    label: "ROI",
    expression: "(revenue - cost) / cost * 100",
    resultType: "percent" as const,
  },
] as const;
