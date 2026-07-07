import {
  addMonths,
  endOfDay,
  endOfMonth,
  formatMonthYear,
  formatRangeLabel,
  startOfDay,
  startOfMonth,
  type DateRange,
} from "@/lib/date-range";
import type { KommoLeadLike, StatusClassification } from "@/lib/kommo/executive-metrics";
import type { ClosingTimeStats, FunnelStage } from "@/types/dashboard-metrics";
import type { AnalyticsMetrics, CohortRow, LeadOriginRow } from "@/types/analytics-metrics";

const MS_DAY = 86_400_000;
const COHORT_OFFSETS = [0, 30, 60, 90, 120] as const;
const COHORT_LABELS = ["Mês 0", "+30d", "+60d", "+90d", "+120d"] as const;

const FUNNEL_STAGE_PATTERNS: { stage: string; patterns: RegExp[] }[] = [
  { stage: "Novo Lead", patterns: [/incoming|contato inicial|novo lead|entrada/i] },
  { stage: "Follow Up", patterns: [/follow\s*up|followup|retorno|seguimento/i] },
  { stage: "Agendamento Proposto", patterns: [/agendamento proposto|proposta de agendamento/i] },
  { stage: "Consulta Confirmada", patterns: [/confirmação|confirmada|confirmado/i] },
  { stage: "Consulta Realizada", patterns: [/consulta realizada|realizada|realizado/i] },
  { stage: "Venda Ganha", patterns: [/venda ganha|ganho|won|sucesso/i] },
];

const ORIGIN_FIELD_PATTERN = /origem|source|utm_source|m[ií]dia|canal/i;

function kommoCalendarDate(value: unknown): Date | null {
  if (value == null) return null;
  if (typeof value === "number") {
    const ms = value < 1e12 ? value * 1000 : value;
    const d = new Date(ms);
    if (Number.isNaN(d.getTime())) return null;
    return new Date(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
  }
  if (typeof value === "string") {
    if (/^[0-9]+$/.test(value.trim())) return kommoCalendarDate(Number(value));
    const iso = /^(\d{4})-(\d{2})-(\d{2})/.exec(value.trim());
    if (iso) return new Date(Number(iso[1]), Number(iso[2]) - 1, Number(iso[3]));
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return null;
    return startOfDay(date);
  }
  return null;
}

function getCreatedAt(lead: KommoLeadLike): Date | null {
  return kommoCalendarDate(lead.created_at ?? lead.date_create);
}

function getClosedAt(lead: KommoLeadLike): Date | null {
  return kommoCalendarDate(lead.closed_at ?? lead.closedAt);
}

function isWon(lead: KommoLeadLike, c: StatusClassification): boolean {
  return lead.status_id !== undefined && c.wonIds.has(lead.status_id);
}

function inDateRange(date: Date | null, range: DateRange): boolean {
  if (!date) return false;
  const t = startOfDay(date).getTime();
  return t >= startOfDay(range.from).getTime() && t <= endOfDay(range.to).getTime();
}

function inCreatedRange(lead: KommoLeadLike, range: DateRange): boolean {
  return inDateRange(getCreatedAt(lead), range);
}

function daysBetween(from: Date, to: Date): number {
  return Math.max(0, Math.floor((startOfDay(to).getTime() - startOfDay(from).getTime()) / MS_DAY));
}

function addDays(d: Date, n: number): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
}

function groupBy<T>(items: T[], keyFn: (item: T) => string | null) {
  const map = new Map<string, T[]>();
  for (const item of items) {
    const key = keyFn(item);
    if (!key) continue;
    const group = map.get(key) ?? [];
    group.push(item);
    map.set(key, group);
  }
  return map;
}

function mapStatusToFunnelStage(statusName: string): string | null {
  const normalized = statusName.toLowerCase();
  for (const { stage, patterns } of FUNNEL_STAGE_PATTERNS) {
    if (patterns.some((p) => p.test(normalized))) return stage;
  }
  return null;
}

function getStatusName(lead: KommoLeadLike, statusMap: Map<number, string>): string {
  if (lead.status_id && statusMap.has(lead.status_id)) return statusMap.get(lead.status_id)!;
  return lead.status_id ? `Status ${lead.status_id}` : "Sem status";
}

export function buildStatusFunnel(
  leads: KommoLeadLike[],
  range: DateRange,
  statusMap: Map<number, string>,
  classification: StatusClassification,
): FunnelStage[] {
  const inRange = leads.filter((l) => inCreatedRange(l, range));
  const stageCounts = new Map<string, number>();
  for (const { stage } of FUNNEL_STAGE_PATTERNS) stageCounts.set(stage, 0);

  for (const lead of inRange) {
    if (isWon(lead, classification)) {
      stageCounts.set("Venda Ganha", (stageCounts.get("Venda Ganha") ?? 0) + 1);
      continue;
    }
    const name = getStatusName(lead, statusMap);
    const stage = mapStatusToFunnelStage(name);
    if (stage) stageCounts.set(stage, (stageCounts.get(stage) ?? 0) + 1);
  }

  const total = inRange.length || 1;
  return FUNNEL_STAGE_PATTERNS.map(({ stage }) => ({
    stage,
    count: stageCounts.get(stage) ?? 0,
    pct: Math.round(((stageCounts.get(stage) ?? 0) / total) * 1000) / 10,
  }));
}

export function buildClosingTime(
  leads: KommoLeadLike[],
  range: DateRange,
  classification: StatusClassification,
): ClosingTimeStats {
  const durations: number[] = [];
  for (const lead of leads) {
    if (!isWon(lead, classification)) continue;
    const closed = getClosedAt(lead);
    const created = getCreatedAt(lead);
    if (!closed || !created) continue;
    if (!inDateRange(closed, range)) continue;
    durations.push(daysBetween(created, closed));
  }

  if (!durations.length) {
    return { avg: 0, median: 0, min: 0, max: 0, histogram: [] };
  }

  const sorted = [...durations].sort((a, b) => a - b);
  const avg = Math.round(sorted.reduce((a, b) => a + b, 0) / sorted.length);
  const median = sorted[Math.floor(sorted.length / 2)] ?? 0;
  const buckets = [0, 7, 14, 30, 60, 90, 9999];
  const labels = ["0-7d", "8-14d", "15-30d", "31-60d", "61-90d", "90d+"];
  const hist = labels.map((label, i) => ({
    label,
    value: sorted.filter((d) => d > buckets[i] && d <= buckets[i + 1]).length,
  }));

  return { avg, median, min: sorted[0] ?? 0, max: sorted[sorted.length - 1] ?? 0, histogram: hist };
}

function extractOrigin(lead: KommoLeadLike): string {
  const fields = lead.custom_fields_values;
  if (!Array.isArray(fields)) return "Não informado";
  for (const field of fields) {
    if (!field || typeof field !== "object") continue;
    const record = field as Record<string, unknown>;
    const label = `${record.field_name ?? ""} ${record.field_code ?? ""} ${record.name ?? ""} ${record.code ?? ""}`;
    if (!ORIGIN_FIELD_PATTERN.test(label)) continue;
    const values = Array.isArray(record.values) ? record.values : record.value !== undefined ? [{ value: record.value }] : [];
    for (const item of values) {
      if (!item || typeof item !== "object") continue;
      const raw = (item as Record<string, unknown>).value;
      const text = typeof raw === "string" ? raw.trim() : typeof raw === "number" ? String(raw) : "";
      if (text) return text;
    }
  }
  return "Não informado";
}

export function buildLeadsByOrigin(leads: KommoLeadLike[], range: DateRange): LeadOriginRow[] {
  const inRange = leads.filter((l) => inCreatedRange(l, range));
  const grouped = groupBy(inRange, (l) => extractOrigin(l));
  const rows = Array.from(grouped.entries())
    .map(([origin, items]) => ({ origin, count: items.length }))
    .sort((a, b) => b.count - a.count);

  const total = inRange.length || 1;
  const top = rows.slice(0, 8);
  const others = rows.slice(8);
  const result: LeadOriginRow[] = top.map((r) => ({
    origin: r.origin,
    count: r.count,
    pct: Math.round((r.count / total) * 1000) / 10,
  }));

  if (others.length) {
    const otherCount = others.reduce((s, r) => s + r.count, 0);
    result.push({
      origin: "Outros",
      count: otherCount,
      pct: Math.round((otherCount / total) * 1000) / 10,
    });
  }

  return result;
}

function formatCohortMonth(d: Date): string {
  const months = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
  return `${months[d.getMonth()]} ${d.getFullYear()}`;
}

export function buildCohortAnalysis(
  leads: KommoLeadLike[],
  classification: StatusClassification,
  reference: Date = new Date(),
): { cohort: CohortRow[]; columnAverages: (number | null)[] } {
  const now = startOfDay(reference);
  const rows: CohortRow[] = [];

  for (let i = 5; i >= 0; i -= 1) {
    const monthStart = startOfMonth(addMonths(now, -i));
    const monthEnd = endOfMonth(monthStart);
    const monthKey = `${monthStart.getFullYear()}-${String(monthStart.getMonth() + 1).padStart(2, "0")}`;
    const cohort = leads.filter((l) => {
      const created = getCreatedAt(l);
      return created && created.getTime() >= monthStart.getTime() && created.getTime() <= endOfDay(monthEnd).getTime();
    });
    const cohortSize = cohort.length;

    const rates = COHORT_OFFSETS.map((offset) => {
      const deadline = endOfDay(addDays(monthStart, offset));
      if (deadline.getTime() > now.getTime()) return null;
      if (cohortSize === 0) return 0;
      const converters = cohort.filter((l) => {
        if (!isWon(l, classification)) return false;
        const closed = getClosedAt(l);
        return closed && closed.getTime() <= deadline.getTime();
      }).length;
      return Math.round((converters / cohortSize) * 1000) / 10;
    });

    rows.push({
      month: formatCohortMonth(monthStart),
      monthKey,
      cohortSize,
      rates,
    });
  }

  const columnAverages = COHORT_OFFSETS.map((_, colIdx) => {
    const values = rows.map((r) => r.rates[colIdx]).filter((v): v is number => v !== null);
    if (!values.length) return null;
    return Math.round((values.reduce((a, b) => a + b, 0) / values.length) * 10) / 10;
  });

  return { cohort: rows, columnAverages };
}

export { COHORT_LABELS };

export function buildAnalyticsMetrics(
  leads: KommoLeadLike[],
  range: DateRange,
  classification: StatusClassification,
  statusMap: Map<number, string>,
): AnalyticsMetrics {
  const { cohort, columnAverages } = buildCohortAnalysis(leads, classification, range.to);
  return {
    periodLabel: formatRangeLabel(range.from, range.to),
    statusFunnel: buildStatusFunnel(leads, range, statusMap, classification),
    closingTime: buildClosingTime(leads, range, classification),
    cohort,
    cohortColumnAverages: columnAverages,
    leadOrigins: buildLeadsByOrigin(leads, range),
  };
}
