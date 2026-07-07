import type { DateGranularity } from "@/types/widget-query";

const DATE_RE = /(\d{4})-(\d{2})-(\d{2})/;
const DATE_BR_RE = /(\d{2})\/(\d{2})\/(\d{4})/;

/** Extrai {y,m,d} de "2025-10-01 15:30:45", ISO ou "01/10/2025". */
function extractYmd(value: string): { y: number; m: number; d: number } | null {
  const iso = value.match(DATE_RE);
  if (iso) {
    return { y: Number(iso[1]), m: Number(iso[2]), d: Number(iso[3]) };
  }
  const br = value.match(DATE_BR_RE);
  if (br) {
    return { y: Number(br[3]), m: Number(br[2]), d: Number(br[1]) };
  }
  return null;
}

/** Verifica se a maioria dos valores de uma coluna parecem datas. */
export function looksLikeDateColumn(values: (string | null)[]): boolean {
  let checked = 0;
  let matched = 0;
  for (const v of values) {
    if (v === null || v === "") continue;
    checked++;
    if (extractYmd(String(v))) matched++;
    if (checked >= 50) break;
  }
  return checked > 0 && matched / checked >= 0.7;
}

/** Início da semana (segunda-feira) em ms. */
function startOfWeek(y: number, m: number, d: number): { y: number; m: number; d: number } {
  const date = new Date(Date.UTC(y, m - 1, d));
  const day = date.getUTCDay(); // 0=domingo
  const diff = (day === 0 ? -6 : 1) - day;
  date.setUTCDate(date.getUTCDate() + diff);
  return { y: date.getUTCFullYear(), m: date.getUTCMonth() + 1, d: date.getUTCDate() };
}

const pad = (n: number) => String(n).padStart(2, "0");

/**
 * Converte um valor de data em um rótulo de bucket legível e ordenável.
 * Retorna `null` quando o valor não é uma data.
 */
export function bucketDateValue(value: string | null, granularity: DateGranularity): string | null {
  if (value === null || value === "") return null;
  const ymd = extractYmd(String(value));
  if (!ymd) return null;
  const { y, m, d } = ymd;

  switch (granularity) {
    case "year":
      return String(y);
    case "month":
      return `${y}-${pad(m)}`;
    case "week": {
      const w = startOfWeek(y, m, d);
      return `${w.y}-${pad(w.m)}-${pad(w.d)}`;
    }
    case "day":
    default:
      return `${y}-${pad(m)}-${pad(d)}`;
  }
}

export const DATE_GRANULARITY_LABELS: Record<DateGranularity, string> = {
  day: "Dia",
  week: "Semana",
  month: "Mês",
  year: "Ano",
};
