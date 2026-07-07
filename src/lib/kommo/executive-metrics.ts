import {
  addMonths,
  endOfMonth,
  formatMonthYear,
  formatRangeLabel,
  endOfDay,
  getPreviousCalendarMonthRange,
  getTrendRange,
  startOfDay,
  startOfMonth,
  startOfWeek,
  toISODate,
  type DateRange,
} from "@/lib/date-range";
import { dedupeKommoLeads, getKommoLeadId } from "@/lib/kommo/lead-dedupe";
import { toKommoCalendarDate } from "@/lib/kommo/kommo-dates";
import type { DashboardFilters, DashboardFilterOptions, FilterOption } from "@/types/dashboard-filters";
import type {
  ClosingTimeStats,
  DashboardMetrics,
  FunnelStage,
  HeatmapCell,
  KpiDelta,
  RankingRow,
  ResponsiblePerformanceRow,
  TimeSeriesPoint,
} from "@/types/dashboard-metrics";

const MS_DAY = 86_400_000;

export type KommoLeadLike = {
  id?: string | number;
  status_id?: number;
  pipeline_id?: number;
  responsible_user_id?: number;
  loss_reason_id?: number | null;
  created_at?: string | number;
  date_create?: string | number;
  closed_at?: string | number;
  is_sale?: boolean;
  is_won?: boolean;
  sale_amount?: number;
  price?: number;
  valor?: number;
  custom_fields_values?: unknown[];
  pipelineId?: number;
  responsibleUserId?: number;
  [key: string]: unknown;
};

export type StatusClassification = {
  wonIds: Set<number>;
  lostIds: Set<number>;
};

const FUNNEL_STAGE_PATTERNS: { stage: string; patterns: RegExp[] }[] = [
  { stage: "Novo Lead", patterns: [/incoming|contato inicial|novo lead|entrada/i] },
  { stage: "Follow Up", patterns: [/follow\s*up|followup|retorno|seguimento/i] },
  { stage: "Agendamento Proposto", patterns: [/agendamento proposto|proposta de agendamento/i] },
  { stage: "Consulta Confirmada", patterns: [/confirmação|confirmada|confirmado/i] },
  { stage: "Consulta Realizada", patterns: [/consulta realizada|realizada|realizado/i] },
  { stage: "Venda Ganha", patterns: [/venda ganha|ganho|won|sucesso/i] },
];

function getCreatedAt(lead: KommoLeadLike): Date | null {
  return toKommoCalendarDate(lead.created_at ?? lead.date_create);
}

function getClosedAt(lead: KommoLeadLike): Date | null {
  return toKommoCalendarDate(lead.closed_at ?? lead.closedAt);
}

function getPipelineId(lead: KommoLeadLike): number | undefined {
  const id = lead.pipeline_id ?? lead.pipelineId;
  return typeof id === "number" ? id : undefined;
}

function getResponsibleId(lead: KommoLeadLike): number | undefined {
  const id = lead.responsible_user_id ?? lead.responsibleUserId;
  return typeof id === "number" ? id : undefined;
}

function isWon(lead: KommoLeadLike, c: StatusClassification): boolean {
  return lead.status_id !== undefined && c.wonIds.has(lead.status_id);
}

function isLost(lead: KommoLeadLike, c: StatusClassification): boolean {
  return lead.status_id !== undefined && c.lostIds.has(lead.status_id);
}

function inDateRange(date: Date | null, range: DateRange): boolean {
  if (!date) return false;
  const t = startOfDay(date).getTime();
  return t >= startOfDay(range.from).getTime() && t <= endOfDay(range.to).getTime();
}

function inCreatedRange(lead: KommoLeadLike, range: DateRange): boolean {
  return inDateRange(getCreatedAt(lead), range);
}

function inClosedRange(lead: KommoLeadLike, range: DateRange): boolean {
  return inDateRange(getClosedAt(lead), range);
}

function extractCustomFieldNumber(fields: unknown, fragments: RegExp[]): number {
  if (!Array.isArray(fields)) return 0;
  for (const field of fields) {
    if (!field || typeof field !== "object") continue;
    const record = field as Record<string, unknown>;
    const label = `${record.field_name ?? ""} ${record.field_code ?? ""} ${record.name ?? ""} ${record.code ?? ""}`.toLowerCase();
    if (!fragments.some((p) => p.test(label))) continue;
    const values = Array.isArray(record.values) ? record.values : record.value !== undefined ? [{ value: record.value }] : [];
    for (const item of values) {
      if (!item || typeof item !== "object") continue;
      const raw = (item as Record<string, unknown>).value;
      const num = typeof raw === "number" ? raw : typeof raw === "string" ? Number(raw.replace(/[^\d.,-]/g, "").replace(",", ".")) : NaN;
      if (Number.isFinite(num) && num > 0) return num;
    }
  }
  return 0;
}

/** Valor do negócio ganho conforme retornado pela API Kommo (price, sale_amount ou campo valor). */
export function getLeadSaleValue(lead: KommoLeadLike): number {
  const candidates = [lead.sale_amount, lead.price, lead.valor];
  for (const raw of candidates) {
    if (typeof raw === "number" && Number.isFinite(raw) && raw > 0) return raw;
  }
  return extractCustomFieldNumber(lead.custom_fields_values, [/valor/, /value/, /pre[cç]o/, /amount/, /receita/]);
}

function sumWonRevenueInRange(leads: KommoLeadLike[], range: DateRange, classification: StatusClassification): number {
  let sum = 0;
  for (const lead of leads) {
    if (!isWon(lead, classification)) continue;
    if (!inClosedRange(lead, range)) continue;
    sum += getLeadSaleValue(lead);
  }
  return sum;
}

function buildGroupedRevenueTimeSeries(
  leads: KommoLeadLike[],
  range: DateRange,
  classification: StatusClassification,
  grouping: TimeGrouping,
): TimeSeriesPoint[] {
  const filtered = leads.filter((l) => isWon(l, classification) && inClosedRange(l, range));

  const grouped = groupBy(filtered, (l) => {
    const closed = getClosedAt(l);
    if (!closed) return null;
    return timeSeriesKey(closed, grouping);
  });

  return Array.from(grouped.entries())
    .map(([key, items]) => {
      const [label, date] = key.split("|");
      const value = items.reduce((acc, item) => acc + getLeadSaleValue(item), 0);
      return { label, value: Math.round(value * 100) / 100, date };
    })
    .sort((a, b) => (a.date! < b.date! ? -1 : 1));
}

function daysBetween(from: Date, to: Date): number {
  return Math.max(0, Math.floor((startOfDay(to).getTime() - startOfDay(from).getTime()) / MS_DAY));
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

export function applyDashboardFilters(leads: KommoLeadLike[], filters: DashboardFilters): KommoLeadLike[] {
  return leads.filter((lead) => {
    if (filters.pipelineIds.length) {
      const pid = getPipelineId(lead);
      if (pid === undefined || !filters.pipelineIds.includes(pid)) return false;
    }
    if (filters.responsibleIds.length) {
      const rid = getResponsibleId(lead);
      if (rid === undefined || !filters.responsibleIds.includes(rid)) return false;
    }
    if (filters.statusIds.length) {
      if (lead.status_id === undefined || !filters.statusIds.includes(lead.status_id)) return false;
    }
    return true;
  });
}

export function buildFilterOptions(
  leads: KommoLeadLike[],
  pipelineMap: Map<number, string>,
  usersMap: Map<number, string>,
  statusMap: Map<number, string>,
): DashboardFilterOptions {
  const pipelineIds = new Set<number>();
  const responsibleIds = new Set<number>();
  const statusIds = new Set<number>();

  for (const lead of leads) {
    const pid = getPipelineId(lead);
    if (pid) pipelineIds.add(pid);
    const rid = getResponsibleId(lead);
    if (rid) responsibleIds.add(rid);
    if (lead.status_id) statusIds.add(lead.status_id);
  }

  const toOptions = (ids: Set<number>, map: Map<number, string>): FilterOption[] =>
    Array.from(ids)
      .map((id) => ({ id, name: map.get(id) ?? `#${id}` }))
      .sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));

  return {
    pipelines: toOptions(pipelineIds, pipelineMap),
    responsibles: toOptions(responsibleIds, usersMap),
    statuses: toOptions(statusIds, statusMap),
  };
}

/** @deprecated Use getPreviousCalendarMonthRange — KPIs comparam sempre ao mês anterior. */
export function previousPeriodRange(range: DateRange): DateRange {
  return getPreviousCalendarMonthRange(range.to);
}

function fillMonthBuckets(range: DateRange, points: TimeSeriesPoint[]): TimeSeriesPoint[] {
  const byDate = new Map<string, TimeSeriesPoint>();
  for (const p of points) {
    if (p.date) byDate.set(p.date, p);
  }
  return monthBucketKeys(range).map(({ label, date }) => byDate.get(date) ?? { label, value: 0, date });
}

function bestMonthPoint(series: TimeSeriesPoint[]): { label: string; value: number } | null {
  const withData = series.filter((p) => p.value > 0);
  if (!withData.length) return null;
  const best = withData.reduce((acc, cur) => (cur.value > acc.value ? cur : acc));
  return { label: best.label, value: best.value };
}

/** Contagem mensal de IDs únicos em todo o histórico (sem filtro de período). */
function buildAllTimeMonthlySeries(
  leads: KommoLeadLike[],
  dateFn: (l: KommoLeadLike) => Date | null,
  predicate?: (l: KommoLeadLike) => boolean,
): TimeSeriesPoint[] {
  const grouped = new Map<string, Set<string>>();
  const labels = new Map<string, string>();

  for (const lead of leads) {
    if (predicate && !predicate(lead)) continue;
    const date = dateFn(lead);
    if (!date) continue;
    const id = getKommoLeadId(lead.id);
    if (!id) continue;
    const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-01`;
    const bucket = grouped.get(monthKey) ?? new Set<string>();
    bucket.add(id);
    grouped.set(monthKey, bucket);
    labels.set(monthKey, formatMonthYear(date));
  }

  return Array.from(grouped.entries())
    .map(([date, ids]) => ({ label: labels.get(date) ?? date, value: ids.size, date }))
    .sort((a, b) => (a.date! < b.date! ? -1 : 1));
}

function buildKpiSparkSeries(
  leads: KommoLeadLike[],
  range: DateRange,
  dateFn: (l: KommoLeadLike) => Date | null,
  predicate?: (l: KommoLeadLike) => boolean,
): TimeSeriesPoint[] {
  return fillMonthBuckets(
    range,
    buildGroupedTimeSeries(leads, range, dateFn, "month", predicate),
  );
}

function kpiDelta(current: number, previous: number): KpiDelta {
  const changePct =
    previous > 0 ? Math.round(((current - previous) / previous) * 1000) / 10 : current > 0 ? 100 : null;
  return { value: current, previousValue: previous, changePct };
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

function buildStatusFunnel(
  leads: KommoLeadLike[],
  range: DateRange,
  statusMap: Map<number, string>,
  classification: StatusClassification,
): FunnelStage[] {
  const inRange = dedupeKommoLeads(leads).filter((l) => inCreatedRange(l, range));
  const stageLeadIds = new Map<string, Set<string>>();
  for (const { stage } of FUNNEL_STAGE_PATTERNS) stageLeadIds.set(stage, new Set());

  for (const lead of inRange) {
    const id = getKommoLeadId(lead.id);
    if (!id) continue;
    if (isWon(lead, classification)) {
      stageLeadIds.get("Venda Ganha")?.add(id);
      continue;
    }
    const name = getStatusName(lead, statusMap);
    const stage = mapStatusToFunnelStage(name);
    if (stage) stageLeadIds.get(stage)?.add(id);
  }

  const stageCounts = new Map<string, number>();
  for (const [stage, ids] of stageLeadIds.entries()) stageCounts.set(stage, ids.size);

  const total = inRange.length || 1;
  return FUNNEL_STAGE_PATTERNS.map(({ stage }) => ({
    stage,
    count: stageCounts.get(stage) ?? 0,
    pct: Math.round(((stageCounts.get(stage) ?? 0) / total) * 1000) / 10,
  }));
}

function buildLeadsByStatus(
  leads: KommoLeadLike[],
  range: DateRange,
  statusMap: Map<number, string>,
): RankingRow[] {
  const inRange = dedupeKommoLeads(leads).filter((l) => inCreatedRange(l, range));
  const groups = new Map<string, Set<string>>();
  for (const lead of inRange) {
    const id = getKommoLeadId(lead.id);
    if (!id) continue;
    const status = getStatusName(lead, statusMap);
    const bucket = groups.get(status) ?? new Set<string>();
    bucket.add(id);
    groups.set(status, bucket);
  }
  return Array.from(groups.entries())
    .map(([primary, ids]) => ({ primary, secondary: null, value: ids.size, rank: 0 }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 15)
    .map((row, i) => ({ ...row, rank: i + 1 }));
}

function buildKanbanSummary(
  leads: KommoLeadLike[],
  statusMap: Map<number, string>,
): FunnelStage[] {
  const unique = dedupeKommoLeads(leads);
  const groups = new Map<string, Set<string>>();
  for (const lead of unique) {
    const id = getKommoLeadId(lead.id);
    if (!id) continue;
    const status = getStatusName(lead, statusMap);
    const bucket = groups.get(status) ?? new Set<string>();
    bucket.add(id);
    groups.set(status, bucket);
  }
  const total = unique.length || 1;
  return Array.from(groups.entries())
    .map(([stage, ids]) => ({
      stage,
      count: ids.size,
      pct: Math.round((ids.size / total) * 1000) / 10,
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 12);
}

function buildTimeSeries(
  leads: KommoLeadLike[],
  range: DateRange,
  dateFn: (l: KommoLeadLike) => Date | null,
  predicate?: (l: KommoLeadLike) => boolean,
): TimeSeriesPoint[] {
  const filtered = leads.filter((l) => {
    if (predicate && !predicate(l)) return false;
    const date = dateFn(l);
    return !!date && inDateRange(date, range);
  });
  const grouped = groupBy(filtered, (l) => {
    const date = dateFn(l);
    if (!date) return null;
    return `${formatMonthYear(date)}|${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
  });
  return Array.from(grouped.entries())
    .map(([key, items]) => {
      const [label] = key.split("|");
      return { label, value: items.length, date: `${key.split("|")[1]}-01` };
    })
    .sort((a, b) => (a.date! < b.date! ? -1 : 1));
}

function buildResponsiblePerformance(
  leads: KommoLeadLike[],
  range: DateRange,
  classification: StatusClassification,
  usersMap: Map<number, string>,
): ResponsiblePerformanceRow[] {
  const inRange = leads.filter((l) => inCreatedRange(l, range));
  const groups = groupBy(inRange, (l) => {
    const id = getResponsibleId(l);
    return id ? usersMap.get(id) ?? `Usuário ${id}` : "Sem responsável";
  });
  return Array.from(groups.entries())
    .map(([name, items]) => {
      const won = items.filter((l) => isWon(l, classification) && inClosedRange(l, range)).length;
      return {
        name,
        leads: items.length,
        won,
        conversionRate: items.length > 0 ? Math.round((won / items.length) * 1000) / 10 : 0,
      };
    })
    .sort((a, b) => b.leads - a.leads)
    .slice(0, 10);
}

function buildPipelineDistribution(
  leads: KommoLeadLike[],
  range: DateRange,
  pipelineMap: Map<number, string>,
): RankingRow[] {
  const inRange = leads.filter((l) => inCreatedRange(l, range));
  const groups = groupBy(inRange, (l) => {
    const id = getPipelineId(l);
    return id ? pipelineMap.get(id) ?? `Pipeline ${id}` : "Sem pipeline";
  });
  return Array.from(groups.entries())
    .map(([primary, items]) => ({ primary, secondary: null, value: items.length, rank: 0 }))
    .sort((a, b) => b.value - a.value)
    .map((row, i) => ({ ...row, rank: i + 1 }));
}

function buildHeatmap(leads: KommoLeadLike[], range: DateRange): HeatmapCell[] {
  const inRange = leads.filter((l) => inCreatedRange(l, range));
  const grid = new Map<string, number>();
  for (const lead of inRange) {
    const created = getCreatedAt(lead);
    if (!created) continue;
    const key = `${created.getDay()}-${created.getHours()}`;
    grid.set(key, (grid.get(key) ?? 0) + 1);
  }
  const cells: HeatmapCell[] = [];
  for (let dow = 0; dow < 7; dow += 1) {
    for (let hour = 0; hour < 24; hour += 1) {
      cells.push({ dayOfWeek: dow, hour, value: grid.get(`${dow}-${hour}`) ?? 0 });
    }
  }
  return cells;
}

function buildClosingTime(
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
    if (closed.getTime() < startOfDay(range.from).getTime() || closed.getTime() > endOfDay(range.to).getTime()) continue;
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

function countKpis(leads: KommoLeadLike[], range: DateRange, classification: StatusClassification) {
  const unique = dedupeKommoLeads(leads);
  const inRange = unique.filter((l) => inCreatedRange(l, range));
  const total = inRange.length;

  const wonClosedIds = new Set<string>();
  for (const lead of unique) {
    if (!isWon(lead, classification) || !inClosedRange(lead, range)) continue;
    const id = getKommoLeadId(lead.id);
    if (id) wonClosedIds.add(id);
  }
  const wonClosed = wonClosedIds.size;

  const cohortWonClosedIds = new Set<string>();
  for (const lead of inRange) {
    if (!isWon(lead, classification) || !inClosedRange(lead, range)) continue;
    const id = getKommoLeadId(lead.id);
    if (id) cohortWonClosedIds.add(id);
  }
  const cohortWonClosed = cohortWonClosedIds.size;

  const lost = inRange.filter((l) => isLost(l, classification)).length;
  const inProgress = Math.max(0, total - cohortWonClosed - lost);
  // Consultas fechadas no período ÷ leads criados no período (mesma lógica do gráfico/sparkline).
  const conversion = total > 0 ? Math.round((wonClosed / total) * 10000) / 100 : 0;
  return {
    total,
    created: total,
    won: wonClosed,
    lost,
    inProgress,
    conversion,
  };
}

function monthBucketKeys(range: DateRange): { label: string; date: string }[] {
  const keys: { label: string; date: string }[] = [];
  let cursor = startOfMonth(range.from);
  const end = startOfMonth(range.to);
  while (cursor.getTime() <= end.getTime()) {
    const monthKey = `${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, "0")}`;
    keys.push({ label: formatMonthYear(cursor), date: `${monthKey}-01` });
    cursor = addMonths(cursor, 1);
  }
  return keys;
}

function weekBucketKeysInMonth(month: Date): { label: string; date: string }[] {
  const start = startOfMonth(month);
  const end = endOfMonth(month);
  const seen = new Set<string>();
  const keys: { label: string; date: string }[] = [];
  let cursor = start;
  while (cursor.getTime() <= end.getTime()) {
    const weekStart = startOfWeek(cursor);
    const iso = toISODate(weekStart);
    if (!seen.has(iso)) {
      seen.add(iso);
      keys.push({
        label: `Sem ${iso.slice(8, 10)}/${iso.slice(5, 7)}`,
        date: iso,
      });
    }
    cursor = new Date(cursor.getFullYear(), cursor.getMonth(), cursor.getDate() + 1);
  }
  return keys;
}

function buildGroupedCountSeries(
  leads: KommoLeadLike[],
  range: DateRange,
  dateFn: (l: KommoLeadLike) => Date | null,
  grouping: "week" | "month",
  predicate: ((l: KommoLeadLike) => boolean) | undefined,
  buckets: { label: string; date: string }[],
): TimeSeriesPoint[] {
  const filtered = leads.filter((l) => {
    if (predicate && !predicate(l)) return false;
    const date = dateFn(l);
    return !!date && inDateRange(date, range);
  });

  const grouped = new Map<string, Set<string>>();
  for (const lead of filtered) {
    const id = getKommoLeadId(lead.id);
    if (!id) continue;
    const date = dateFn(lead);
    if (!date) continue;
    const key = timeSeriesKey(date, grouping);
    const bucket = grouped.get(key) ?? new Set<string>();
    bucket.add(id);
    grouped.set(key, bucket);
  }

  const byDate = new Map<string, number>();
  for (const [key, ids] of grouped.entries()) {
    const datePart = key.split("|")[1];
    if (datePart) byDate.set(datePart, ids.size);
  }

  return buckets.map(({ label, date }) => ({
    label,
    date,
    value: byDate.get(date) ?? 0,
  }));
}

export function buildComparisonChartSeries(
  leads: KommoLeadLike[],
  classification: StatusClassification,
  mode: ChartGrouping,
  selectedRange: DateRange,
): ComparisonChartSeries {
  if (mode === "week") {
    const monthRange = {
      from: startOfMonth(selectedRange.to),
      to: endOfMonth(selectedRange.to),
    };
    const buckets = weekBucketKeysInMonth(monthRange.from);
    return {
      leads: buildGroupedCountSeries(leads, monthRange, getCreatedAt, "week", undefined, buckets),
      sales: buildGroupedCountSeries(leads, monthRange, getClosedAt, "week", (l) => isWon(l, classification), buckets),
    };
  }

  const buckets = monthBucketKeys(selectedRange);
  return {
    leads: buildGroupedCountSeries(leads, selectedRange, getCreatedAt, "month", undefined, buckets),
    sales: buildGroupedCountSeries(leads, selectedRange, getClosedAt, "month", (l) => isWon(l, classification), buckets),
  };
}

export function buildExecutiveMetrics(
  allLeads: KommoLeadLike[],
  range: DateRange,
  filters: DashboardFilters,
  classification: StatusClassification,
  pipelineMap: Map<number, string>,
  usersMap: Map<number, string>,
  statusMap: Map<number, string>,
  apiTotal: number,
): DashboardMetrics {
  const dedupedAll = dedupeKommoLeads(allLeads);
  const leads = applyDashboardFilters(dedupedAll, filters);
  const prevRange = getPreviousCalendarMonthRange(range.to);
  const current = countKpis(leads, range, classification);
  const previous = countKpis(leads, prevRange, classification);
  const monthlyRevenue = sumWonRevenueInRange(leads, range, classification);
  const previousRevenue = sumWonRevenueInRange(leads, prevRange, classification);
  const statusFunnel = buildStatusFunnel(leads, range, statusMap, classification);
  const closingTime = buildClosingTime(leads, range, classification);
  const trendRange = getTrendRange(range.to);
  const leadsOverTime = buildKpiSparkSeries(leads, trendRange, getCreatedAt);
  const salesOverTime = buildKpiSparkSeries(leads, trendRange, getClosedAt, (l) => isWon(l, classification));
  const revenueOverTime = fillMonthBuckets(
    trendRange,
    buildGroupedRevenueTimeSeries(leads, trendRange, classification, "month"),
  );
  const chartWeek = buildComparisonChartSeries(leads, classification, "week", trendRange);
  const allTimeLeadsByMonth = buildAllTimeMonthlySeries(leads, getCreatedAt);
  const allTimeConsultasByMonth = buildAllTimeMonthlySeries(leads, getClosedAt, (l) => isWon(l, classification));

  return {
    periodLabel: formatRangeLabel(range.from, range.to),
    previousPeriodLabel: formatMonthYear(prevRange.from),
    filterOptions: buildFilterOptions(dedupedAll, pipelineMap, usersMap, statusMap),

    totalLeads: current.total,
    newLeads: current.created,
    wonLeads: current.won,
    lostLeads: current.lost,
    inProgressLeads: current.inProgress,
    conversionRate: current.conversion,
    avgClosingDays: closingTime.avg,
    monthlyRevenue,
    revenueOverTime,

    kpiDeltas: {
      totalLeads: kpiDelta(current.total, previous.total),
      newLeads: kpiDelta(current.created, previous.created),
      wonLeads: kpiDelta(current.won, previous.won),
      lostLeads: kpiDelta(current.lost, previous.lost),
      inProgressLeads: kpiDelta(current.inProgress, previous.inProgress),
      conversionRate: kpiDelta(current.conversion, previous.conversion),
      monthlyRevenue: kpiDelta(monthlyRevenue, previousRevenue),
    },

    statusFunnel,
    conversionFunnel: statusFunnel,
    leadsByStatus: buildLeadsByStatus(leads, range, statusMap),
    kanbanSummary: buildKanbanSummary(leads, statusMap),
    leadsOverTime,
    salesOverTime,
    chartLeadsWeek: chartWeek.leads,
    chartSalesWeek: chartWeek.sales,
    /** Mesma série de 6 meses das sparklines — independente do filtro dos KPIs. */
    chartLeadsMonth: leadsOverTime,
    chartSalesMonth: salesOverTime,
    responsiblePerformance: buildResponsiblePerformance(leads, range, classification, usersMap),
    pipelineDistribution: buildPipelineDistribution(leads, range, pipelineMap),
    leadEntryHeatmap: buildHeatmap(leads, range),
    closingTime,
    bestMonthLeadsAllTime: bestMonthPoint(allTimeLeadsByMonth),
    bestMonthConsultasAllTime: bestMonthPoint(allTimeConsultasByMonth),
  };
}

export type TimeGrouping = "day" | "week" | "month";

export type ChartGrouping = "week" | "month";

export type ComparisonChartSeries = {
  leads: TimeSeriesPoint[];
  sales: TimeSeriesPoint[];
};

function timeSeriesKey(date: Date, grouping: TimeGrouping): string {
  if (grouping === "day") {
    const iso = toISODate(date);
    const [y, m, d] = iso.split("-");
    return `${d}/${m}/${y.slice(2)}|${iso}`;
  }
  if (grouping === "week") {
    const weekStart = startOfWeek(date);
    const iso = toISODate(weekStart);
    const label = `Sem ${iso.slice(8, 10)}/${iso.slice(5, 7)}`;
    return `${label}|${iso}`;
  }
  const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
  return `${formatMonthYear(date)}|${monthKey}-01`;
}

export function buildGroupedTimeSeries(
  leads: KommoLeadLike[],
  range: DateRange,
  dateFn: (l: KommoLeadLike) => Date | null,
  grouping: TimeGrouping,
  predicate?: (l: KommoLeadLike) => boolean,
): TimeSeriesPoint[] {
  const filtered = leads.filter((l) => {
    if (predicate && !predicate(l)) return false;
    const date = dateFn(l);
    return !!date && inDateRange(date, range);
  });
  const grouped = new Map<string, Set<string>>();
  for (const lead of filtered) {
    const id = getKommoLeadId(lead.id);
    if (!id) continue;
    const date = dateFn(lead);
    if (!date) continue;
    const key = timeSeriesKey(date, grouping);
    const bucket = grouped.get(key) ?? new Set<string>();
    bucket.add(id);
    grouped.set(key, bucket);
  }
  return Array.from(grouped.entries())
    .map(([key, ids]) => {
      const [label, date] = key.split("|");
      return { label, value: ids.size, date };
    })
    .sort((a, b) => (a.date! < b.date! ? -1 : 1));
}
