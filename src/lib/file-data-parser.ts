import type { WidgetType } from "@/types/dashboard-layout";
import type { CohortRow, RankingRow, TimeSeriesPoint } from "@/types/dashboard-metrics";
import type { CohortPayload, CustomDataPayload, KpiPayload, LineChartPayload, RankingPayload } from "@/types/data-source";

function parseCsv(text: string): string[][] {
  const lines = text.trim().split(/\r?\n/).filter(Boolean);
  return lines.map((line) => {
    const parts: string[] = [];
    let cur = "";
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const c = line[i];
      if (c === '"') inQuotes = !inQuotes;
      else if ((c === "," || c === ";") && !inQuotes) {
        parts.push(cur.trim());
        cur = "";
      } else cur += c;
    }
    parts.push(cur.trim());
    return parts;
  });
}

function num(v: string) {
  const n = Number(v.replace(",", "."));
  return Number.isFinite(n) ? n : 0;
}

function toRankingRows(rows: string[][]): Omit<RankingRow, "rank">[] {
  const [header, ...body] = rows;
  const hasHeader = header?.some((h) => /primary|local|origem|nome/i.test(h));
  const data = hasHeader ? body : rows;
  return data.map((r) => ({
    primary: r[0] ?? "—",
    secondary: r[1] && r[1] !== "" ? r[1] : null,
    value: num(r[hasHeader ? 2 : r.length - 1] ?? "0"),
  }));
}

function toTimeSeries(rows: string[][]): TimeSeriesPoint[] {
  const [header, ...body] = rows;
  const hasDate = header?.some((h) => /date|data/i.test(h));
  const data = header && /label|valor|value/i.test(header.join("")) ? body : rows;
  return data.map((r) => {
    if (hasDate && r.length >= 3) {
      return { label: r[1] ?? r[0], value: num(r[2]), date: r[0] };
    }
    return { label: r[0] ?? "", value: num(r[1] ?? "0"), date: r[2] };
  });
}

function parseJsonPayload(widgetType: WidgetType, raw: unknown): CustomDataPayload {
  const obj = raw as Record<string, unknown>;
  switch (widgetType) {
    case "kpi": {
      const value = obj.value ?? obj.valor;
      if (value === undefined) throw new Error('KPI: informe "value" no JSON.');
      return { value: value as number | string, hint: obj.hint as string | undefined, format: obj.format as "percent" | undefined };
    }
    case "lineChart":
    case "barChart":
    case "areaChart": {
      const arr = (obj.data ?? obj.series ?? obj.points) as TimeSeriesPoint[] | undefined;
      if (!Array.isArray(arr)) throw new Error('Gráfico: informe "data": [{ "label", "value" }].');
      return { data: arr, subtitle: obj.subtitle as string | undefined };
    }
    case "pieChart":
    case "rankingTable": {
      const rows = obj.rows as Omit<RankingRow, "rank">[] | undefined;
      if (!Array.isArray(rows)) throw new Error('Ranking: informe "rows": [{ "primary", "value" }].');
      return {
        rows,
        primaryLabel: obj.primaryLabel as string | undefined,
        secondaryLabel: obj.secondaryLabel as string | undefined,
      };
    }
    case "cohortTable":
    case "cohortChart": {
      const rows = obj.rows as CohortRow[] | undefined;
      if (!Array.isArray(rows)) throw new Error('Coorte: informe "rows" com colunas da tabela.');
      return { rows, total: obj.total as CohortRow | undefined };
    }
    default:
      throw new Error("Tipo de painel inválido.");
  }
}

/** Interpreta JSON ou CSV conforme o tipo do widget. */
export function parseFileToPayload(
  widgetType: WidgetType,
  fileName: string,
  text: string,
): CustomDataPayload {
  const lower = fileName.toLowerCase();
  if (lower.endsWith(".json")) {
    return parseJsonPayload(widgetType, JSON.parse(text));
  }

  const rows = parseCsv(text);
  if (!rows.length) throw new Error("Arquivo vazio.");

  switch (widgetType) {
    case "kpi": {
      if (rows.length === 1 && rows[0].length === 1) {
        return { value: num(rows[0][0]) };
      }
      const v = rows[1]?.[1] ?? rows[0]?.[1] ?? rows[0]?.[0];
      return { value: num(v ?? "0"), hint: rows[1]?.[0] };
    }
    case "lineChart":
    case "barChart":
    case "areaChart":
      return { data: toTimeSeries(rows) };
    case "pieChart":
    case "rankingTable":
      return { rows: toRankingRows(rows), primaryLabel: "Item", secondaryLabel: "Detalhe" };
    case "cohortTable":
    case "cohortChart": {
      const cohortRows: CohortRow[] = rows.slice(1).map((r) => ({
        weekLabel: r[0] ?? "",
        leads: num(r[1] ?? "0"),
        conversions: num(r[2] ?? "0"),
        pctWeek0: num(r[3] ?? "0"),
        pctWeek1: num(r[4] ?? "0"),
        pctWeek2: num(r[5] ?? "0"),
        pctWeek3: num(r[6] ?? "0"),
        pctMonth0: num(r[7] ?? "0"),
        pctMonth1: num(r[8] ?? "0"),
        conversionRate: num(r[9] ?? r[r.length - 1] ?? "0"),
      }));
      return { rows: cohortRows };
    }
    default:
      throw new Error("Tipo não suportado.");
  }
}
