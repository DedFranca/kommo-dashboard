export type DateRange = { from: Date; to: Date };

const MONTHS_PT = [
  "janeiro",
  "fevereiro",
  "março",
  "abril",
  "maio",
  "junho",
  "julho",
  "agosto",
  "setembro",
  "outubro",
  "novembro",
  "dezembro",
];

export function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

export function endOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999);
}

export function parseISODate(s: string | undefined): Date | null {
  if (!s) return null;
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(s);
  if (!m) return null;
  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  return Number.isNaN(d.getTime()) ? null : startOfDay(d);
}

export function toISODate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function formatDateBR(d: Date): string {
  const day = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");
  return `${day}/${month}/${d.getFullYear()}`;
}

export function formatRangeLabel(from: Date, to: Date): string {
  return `${formatDateBR(from)} — ${formatDateBR(to)}`;
}

export function formatMonthYear(d: Date): string {
  return `${MONTHS_PT[d.getMonth()]} ${d.getFullYear()}`;
}

export function isDateInRange(dateStr: string | undefined, from: Date, to: Date): boolean {
  if (!dateStr) return true;
  const d = parseISODate(dateStr);
  if (!d) return true;
  const a = startOfDay(from).getTime();
  const b = startOfDay(to).getTime();
  const t = d.getTime();
  return t >= Math.min(a, b) && t <= Math.max(a, b);
}

export function isSameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

export function isSameMonth(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth();
}

export function isBefore(a: Date, b: Date): boolean {
  return startOfDay(a).getTime() < startOfDay(b).getTime();
}

export function isAfter(a: Date, b: Date): boolean {
  return startOfDay(a).getTime() > startOfDay(b).getTime();
}

export function addMonths(d: Date, n: number): Date {
  return new Date(d.getFullYear(), d.getMonth() + n, 1);
}

export function startOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

export function endOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth() + 1, 0);
}

/** Período padrão: primeiro ao último dia do mês calendário atual. */
export function getDefaultDateRange(): DateRange {
  const now = new Date();
  return {
    from: startOfMonth(now),
    to: endOfMonth(now),
  };
}

/** Mês calendário imediatamente anterior ao mês de `reference`. */
export function getPreviousCalendarMonthRange(reference: Date = new Date()): DateRange {
  const monthStart = startOfMonth(reference);
  const prevStart = addMonths(monthStart, -1);
  return { from: prevStart, to: endOfMonth(prevStart) };
}

/**
 * Janela mínima de leads a buscar na API: coorte (6 meses) + mês anterior (KPIs) + período selecionado.
 */
export function getMetricsFetchRange(range: DateRange): DateRange {
  const cohortStart = startOfMonth(addMonths(range.from, -5));
  const prevMonth = getPreviousCalendarMonthRange(range.to);
  const from = prevMonth.from.getTime() < cohortStart.getTime() ? prevMonth.from : cohortStart;
  return { from, to: endOfDay(range.to) };
}

/** Últimos 6 meses calendário, incluindo o mês atual. */
export function getLastSixMonthsRange(): DateRange {
  const now = new Date();
  return getTrendRange(now);
}

export const DASHBOARD_TREND_MONTHS = 6;

export function getTrendRange(referenceEnd: Date = new Date()): DateRange {
  const end = endOfMonth(referenceEnd);
  return {
    from: startOfMonth(addMonths(end, -(DASHBOARD_TREND_MONTHS - 1))),
    to: end,
  };
}

/** @deprecated use getDefaultDateRange() */
export const DEFAULT_DATE_RANGE: DateRange = getDefaultDateRange();

/** Domingo como início da semana (padrão BR em calendários visuais). */
export function startOfWeek(d: Date): Date {
  const day = d.getDay();
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() - day);
}

export function endOfWeek(d: Date): Date {
  const s = startOfWeek(d);
  return new Date(s.getFullYear(), s.getMonth(), s.getDate() + 6);
}

export function eachDayInInterval(start: Date, end: Date): Date[] {
  const days: Date[] = [];
  const cur = startOfDay(start);
  const last = startOfDay(end).getTime();
  while (cur.getTime() <= last) {
    days.push(new Date(cur));
    cur.setDate(cur.getDate() + 1);
  }
  return days;
}

export function isBetweenInclusive(day: Date, start: Date, end: Date): boolean {
  const t = startOfDay(day).getTime();
  const a = startOfDay(start).getTime();
  const b = startOfDay(end).getTime();
  return t >= Math.min(a, b) && t <= Math.max(a, b);
}
