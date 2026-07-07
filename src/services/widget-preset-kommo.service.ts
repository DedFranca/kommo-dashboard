import { prisma } from "@/lib/prisma";
import {
  DEFAULT_DATE_RANGE,
  formatMonthYear,
  parseISODate,
  startOfDay,
  startOfWeek,
  toISODate,
  type DateRange,
} from "@/lib/date-range";
import { isKommoConfigured, kommoFetch, verifyKommoConnection } from "@/lib/kommo/client";
import { dedupeKommoLeads } from "@/lib/kommo/lead-dedupe";
import { toKommoCalendarDate } from "@/lib/kommo/kommo-dates";
import { getDashboardExtras, saveDashboardSettings } from "@/services/data-source.service";
import type { DashboardSettings } from "@/types/data-source";
import type { KommoSummary } from "@/types/kommo-summary";
import type { CohortRow, RankingRow, TimeSeriesPoint, WidgetPresetMetrics } from "@/types/dashboard-metrics";

type KommoLead = {
  id?: string | number;
  status_id?: number;
  loss_reason_id?: number | null;
  source_id?: number;
  created_at?: string | number;
  date_create?: string | number;
  next_activity_at?: string | number;
  next_activity_date?: string | number;
  closed_at?: string | number;
  sale_amount?: number;
  is_sale?: boolean;
  is_won?: boolean;
  custom_fields_values?: unknown[];
  _embedded?: {
    contacts?: unknown[];
    source?: { id?: number; name?: string };
    tags?: { id?: number; name?: string }[];
  };
  [key: string]: unknown;
};

type KommoLeadsResponse = {
  _embedded?: { leads?: KommoLead[] };
  _page?: { total?: number };
};

type KommoPipelineStatus = {
  id: number;
  name?: string;
  type?: number;
  sort?: number;
};

type KommoPipeline = {
  id: number;
  _embedded?: { statuses?: KommoPipelineStatus[] };
};

type KommoPipelinesResponse = {
  _embedded?: { pipelines?: KommoPipeline[] };
};

type KommoCustomFieldDef = {
  id: number;
  name?: string;
  code?: string | null;
  type?: string;
};

type KommoCustomFieldsResponse = {
  _embedded?: { custom_fields?: KommoCustomFieldDef[] };
};

type FieldCatalog = {
  originFieldIds: number[];
  locationFieldIds: number[];
  doctorFieldIds: number[];
  utmSourceFieldIds: number[];
  utmMediumFieldIds: number[];
};

type StatusClassification = {
  wonIds: Set<number>;
  lostIds: Set<number>;
};

const CACHE_TTL_MINUTES = Number(process.env.KOMMO_METRICS_CACHE_TTL_MINUTES ?? "20");
const KOMMO_WON_STATUS_IDS = parseNumberList(process.env.KOMMO_WON_STATUS_IDS);
const KOMMO_LOST_STATUS_IDS = parseNumberList(process.env.KOMMO_LOST_STATUS_IDS);
const KOMMO_REFRESH_SECRET = process.env.KOMMO_REFRESH_SECRET;
const KOMMO_LEADS_PAGE_LIMIT = 250;

const ORIGIN_FIELD_IDS = parseNumberList(process.env.KOMMO_ORIGIN_FIELD_IDS);
const LOCATION_FIELD_IDS = parseNumberList(process.env.KOMMO_LOCATION_FIELD_IDS);
const DOCTOR_FIELD_IDS = parseNumberList(process.env.KOMMO_DOCTOR_FIELD_IDS);
const UTM_SOURCE_FIELD_IDS = parseNumberList(process.env.KOMMO_UTM_SOURCE_FIELD_IDS);

const ORIGIN_FIELD_FRAGMENTS = parseFragmentList(process.env.KOMMO_ORIGIN_FIELD_CODES, ["origem"]);
const LOCATION_FIELD_FRAGMENTS = parseFragmentList(process.env.KOMMO_LOCATION_FIELD_CODES, [
  "local da consulta",
  "local",
  "unidade",
  "clinic",
  "clínica",
  "cidade",
]);
const DOCTOR_FIELD_FRAGMENTS = parseFragmentList(process.env.KOMMO_DOCTOR_FIELD_CODES, ["médico", "medico", "doctor"]);
const UTM_SOURCE_FRAGMENTS = parseFragmentList(process.env.KOMMO_UTM_SOURCE_FIELD_CODES, ["utm_source"]);
const UTM_MEDIUM_FRAGMENTS = parseFragmentList(process.env.KOMMO_UTM_MEDIUM_FIELD_CODES, ["utm_medium"]);
const SECONDARY_FIELD_FRAGMENTS = parseFragmentList(process.env.KOMMO_SECONDARY_FIELD_CODES, [
  "consulta",
  "particular",
  "plano",
  "convênio",
  "convenio",
  "tipo",
]);
const APPOINTMENT_FIELD_FRAGMENTS = parseFragmentList(process.env.KOMMO_APPOINTMENT_FIELD_CODES, [
  "appointment",
  "agendamento",
  "next activity",
  "agenda",
]);

const MS_DAY = 86_400_000;

let pipelineClassificationCache: StatusClassification | null = null;
let pipelineClassificationFetchedAt = 0;
let fieldCatalogCache: FieldCatalog | null = null;
const PIPELINE_CACHE_TTL_MS = 10 * 60 * 1000;

function parseNumberList(value: string | undefined | null): number[] {
  if (!value) return [];
  return value
    .split(/[,;]+/)
    .map((item) => Number(item.trim()))
    .filter((id) => Number.isFinite(id));
}

function parseFragmentList(value: string | undefined | null, defaults: string[]): string[] {
  if (!value?.trim()) return defaults;
  return value
    .split(/[,;]+/)
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean);
}

function parseKommoInstant(value: unknown): Date | null {
  if (value == null) return null;
  if (typeof value === "number") {
    const ms = value < 1e12 ? value * 1000 : value;
    const date = new Date(ms);
    return Number.isNaN(date.getTime()) ? null : date;
  }

  if (typeof value === "string") {
    const numeric = Number(value);
    if (!Number.isNaN(numeric) && /^[0-9]+$/.test(value.trim())) {
      return parseKommoInstant(numeric);
    }
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
  }

  return null;
}

function normalizeText(value: unknown): string | null {
  if (typeof value !== "string" && typeof value !== "number") return null;
  const text = String(value).trim();
  return text.length ? text : null;
}

function normalizeFieldLabel(value: unknown): string {
  return normalizeText(value)?.toLowerCase() ?? "";
}

function extractCustomFieldText(field: unknown): string | null {
  if (!field || typeof field !== "object") return null;
  const record = field as Record<string, unknown>;
  const values = Array.isArray(record.values)
    ? record.values
    : record.value !== undefined
      ? [{ value: record.value }]
      : [];

  for (const item of values) {
    if (!item || typeof item !== "object") continue;
    const entry = item as Record<string, unknown>;
    const raw = entry.value;
    if (typeof raw === "string" || typeof raw === "number") {
      const text = normalizeText(raw);
      if (text) return text;
    }
  }
  return null;
}

function getCustomFieldValue(fields: unknown, fragments: string[]): string | null {
  if (!Array.isArray(fields)) return null;
  for (const field of fields) {
    if (!field || typeof field !== "object") continue;
    const record = field as Record<string, unknown>;
    const fieldName = normalizeFieldLabel(record.field_name ?? record.name);
    const fieldCode = normalizeFieldLabel(record.field_code ?? record.code);
    const label = `${fieldName} ${fieldCode}`.trim();
    if (!fragments.some((fragment) => label.includes(fragment))) continue;
    const value = extractCustomFieldText(field);
    if (value) return value;
  }
  return null;
}

function getCustomFieldValueByIds(fields: unknown, fieldIds: number[]): string | null {
  if (!fieldIds.length || !Array.isArray(fields)) return null;
  const idSet = new Set(fieldIds);
  for (const field of fields) {
    if (!field || typeof field !== "object") continue;
    const fieldId = Number((field as Record<string, unknown>).field_id);
    if (!idSet.has(fieldId)) continue;
    const value = extractCustomFieldText(field);
    if (value) return value;
  }
  return null;
}

function getLeadCustomFieldValue(lead: KommoLead, fragments: string[], fieldIds: number[] = []): string | null {
  const byId = getCustomFieldValueByIds(lead.custom_fields_values, fieldIds);
  if (byId) return byId;

  const leadValue = getCustomFieldValue(lead.custom_fields_values, fragments);
  if (leadValue) return leadValue;

  const contacts = Array.isArray(lead._embedded?.contacts) ? lead._embedded.contacts : [];
  for (const contact of contacts) {
    const contactRecord = contact as Record<string, unknown>;
    const contactById = getCustomFieldValueByIds(contactRecord.custom_fields_values, fieldIds);
    if (contactById) return contactById;
    const contactValue = getCustomFieldValue(contactRecord.custom_fields_values, fragments);
    if (contactValue) return contactValue;
  }

  return null;
}

async function fetchLeadFieldCatalog(): Promise<FieldCatalog> {
  if (fieldCatalogCache) return fieldCatalogCache;

  const fallback: FieldCatalog = {
    originFieldIds: ORIGIN_FIELD_IDS,
    locationFieldIds: LOCATION_FIELD_IDS,
    doctorFieldIds: DOCTOR_FIELD_IDS,
    utmSourceFieldIds: UTM_SOURCE_FIELD_IDS,
    utmMediumFieldIds: [],
  };

  try {
    const data = await kommoFetch<KommoCustomFieldsResponse>("/leads/custom_fields");
    const fields = Array.isArray(data._embedded?.custom_fields) ? data._embedded.custom_fields : [];

    const byName = (patterns: RegExp[]) =>
      fields.filter((field) => {
        const name = normalizeFieldLabel(field.name);
        const code = normalizeFieldLabel(field.code);
        return patterns.some((pattern) => pattern.test(name) || (code && pattern.test(code)));
      }).map((field) => field.id);

    fieldCatalogCache = {
      originFieldIds: ORIGIN_FIELD_IDS.length ? ORIGIN_FIELD_IDS : byName([/^origem$/]),
      locationFieldIds: LOCATION_FIELD_IDS.length ? LOCATION_FIELD_IDS : byName([/^local da consulta$/, /^local$/, /unidade/, /cl[ií]nica/]),
      doctorFieldIds: DOCTOR_FIELD_IDS.length ? DOCTOR_FIELD_IDS : byName([/^m[eé]dico$/, /^doctor$/]),
      utmSourceFieldIds: UTM_SOURCE_FIELD_IDS.length ? UTM_SOURCE_FIELD_IDS : byName([/^utm_source$/, /utm.source/]),
      utmMediumFieldIds: byName([/^utm_medium$/, /utm.medium/]),
    };
  } catch (error) {
    console.error("[kommo] Failed to fetch custom field catalog:", error instanceof Error ? error.message : error);
    fieldCatalogCache = fallback;
  }

  return fieldCatalogCache;
}

function getEmbeddedSourceName(lead: KommoLead): string | null {
  const name = normalizeText(lead._embedded?.source?.name);
  if (!name) return null;
  if (/^\d{10,}$/.test(name.replace(/\D/g, ""))) return `WhatsApp (${name})`;
  return name;
}

function getLeadTagName(lead: KommoLead): string | null {
  const tags = Array.isArray(lead._embedded?.tags) ? lead._embedded.tags : [];
  for (const tag of tags) {
    const name = normalizeText(tag.name);
    if (name) return name;
  }
  return null;
}

function getLeadCreatedAt(lead: KommoLead): Date | null {
  return toKommoCalendarDate(lead.created_at ?? lead.date_create ?? lead.createdAt ?? lead.dateCreated);
}

function getLeadClosedAt(lead: KommoLead): Date | null {
  return toKommoCalendarDate(lead.closed_at ?? lead.closedAt ?? lead.sale_at ?? lead.date_close);
}

function getLeadNextActivityAt(lead: KommoLead): Date | null {
  return (
    parseKommoInstant(lead.next_activity_at ?? lead.next_activity_date ?? lead.next_activity_time) ??
    parseKommoInstant(getLeadCustomFieldValue(lead, APPOINTMENT_FIELD_FRAGMENTS))
  );
}

function matchesStatusName(name: string | undefined, patterns: RegExp[]): boolean {
  if (!name) return false;
  const normalized = name.toLowerCase();
  return patterns.some((pattern) => pattern.test(normalized));
}

async function fetchPipelineClassification(): Promise<StatusClassification> {
  const now = Date.now();
  if (pipelineClassificationCache && now - pipelineClassificationFetchedAt < PIPELINE_CACHE_TTL_MS) {
    return pipelineClassificationCache;
  }

  const wonIds = new Set(KOMMO_WON_STATUS_IDS);
  const lostIds = new Set(KOMMO_LOST_STATUS_IDS);

  if (wonIds.size > 0 || lostIds.size > 0) {
    pipelineClassificationCache = { wonIds, lostIds };
    pipelineClassificationFetchedAt = now;
    return pipelineClassificationCache;
  }

  try {
    const data = await kommoFetch<KommoPipelinesResponse>("/leads/pipelines");
    const pipelines = Array.isArray(data._embedded?.pipelines) ? data._embedded.pipelines : [];

    const wonPatterns = [/won|ganho|sucesso|closed won|vendido/i];
    const lostPatterns = [/lost|perdido|perda|closed lost|cancelad|descartad/i];

    for (const pipeline of pipelines) {
      const statuses = Array.isArray(pipeline._embedded?.statuses) ? pipeline._embedded.statuses : [];
      const sorted = [...statuses].sort((a, b) => (a.sort ?? 0) - (b.sort ?? 0));

      for (const status of sorted) {
        if (matchesStatusName(status.name, wonPatterns)) wonIds.add(status.id);
        if (matchesStatusName(status.name, lostPatterns)) lostIds.add(status.id);
      }

      if (wonIds.size === 0 && sorted.length > 0) {
        const last = sorted[sorted.length - 1];
        if (last?.id) wonIds.add(last.id);
      }
      if (lostIds.size === 0 && sorted.length > 1) {
        const secondLast = sorted[sorted.length - 2];
        if (secondLast?.id && !wonIds.has(secondLast.id)) lostIds.add(secondLast.id);
      }
    }
  } catch (error) {
    console.error("[kommo] Failed to fetch pipelines:", error instanceof Error ? error.message : error);
  }

  pipelineClassificationCache = { wonIds, lostIds };
  pipelineClassificationFetchedAt = now;
  return pipelineClassificationCache;
}

function isStatusWon(statusId: number | undefined, classification: StatusClassification): boolean {
  return statusId !== undefined && classification.wonIds.has(statusId);
}

function isStatusLost(statusId: number | undefined, classification: StatusClassification): boolean {
  return statusId !== undefined && classification.lostIds.has(statusId);
}

function isWonLead(lead: KommoLead, classification: StatusClassification): boolean {
  return isStatusWon(lead.status_id, classification);
}

function getLeadOrigin(lead: KommoLead, catalog: FieldCatalog): string | null {
  return (
    getLeadCustomFieldValue(lead, ORIGIN_FIELD_FRAGMENTS, catalog.originFieldIds) ??
    getLeadCustomFieldValue(lead, UTM_SOURCE_FRAGMENTS, catalog.utmSourceFieldIds) ??
    normalizeText(lead.utm_source) ??
    getEmbeddedSourceName(lead) ??
    normalizeText(lead.origin) ??
    normalizeText(lead.source) ??
    normalizeText(lead.source_name) ??
    getLeadTagName(lead)
  );
}

function getLeadLocation(lead: KommoLead, catalog: FieldCatalog): string | null {
  return (
    getLeadCustomFieldValue(lead, LOCATION_FIELD_FRAGMENTS, catalog.locationFieldIds) ??
    normalizeText(lead.location) ??
    normalizeText(lead.clinic) ??
    normalizeText(lead.unit) ??
    normalizeText(lead.city) ??
    normalizeText(lead.cidade)
  );
}

function getLeadDoctor(lead: KommoLead, catalog: FieldCatalog): string | null {
  return getLeadCustomFieldValue(lead, DOCTOR_FIELD_FRAGMENTS, catalog.doctorFieldIds);
}

function getLeadOriginSecondary(lead: KommoLead, catalog: FieldCatalog): string | null {
  return (
    getLeadCustomFieldValue(lead, UTM_MEDIUM_FRAGMENTS, catalog.utmMediumFieldIds) ??
    getLeadLocation(lead, catalog) ??
    getLeadDoctor(lead, catalog) ??
    getLeadCustomFieldValue(lead, SECONDARY_FIELD_FRAGMENTS)
  );
}

function getLeadLocationSecondary(lead: KommoLead, catalog: FieldCatalog): string | null {
  return getLeadDoctor(lead, catalog) ?? getLeadCustomFieldValue(lead, SECONDARY_FIELD_FRAGMENTS);
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

function formatWeekLabel(date: Date): string {
  return `Semana ${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function daysBetween(from: Date, to: Date): number {
  return Math.max(0, Math.floor((startOfDay(to).getTime() - startOfDay(from).getTime()) / MS_DAY));
}

function cumulativeConversionPct(leads: KommoLead[], classification: StatusClassification, maxDays: number): number {
  if (leads.length === 0) return 0;
  const converted = leads.filter((lead) => {
    if (!isWonLead(lead, classification)) return false;
    const createdAt = getLeadCreatedAt(lead);
    const closedAt = getLeadClosedAt(lead);
    if (!createdAt || !closedAt) return false;
    return daysBetween(createdAt, closedAt) <= maxDays;
  }).length;
  return Math.round((converted / leads.length) * 10000) / 100;
}

function buildCohortRows(leads: KommoLead[], range: DateRange, classification: StatusClassification): CohortRow[] {
  const cohortLeads = leads.filter((lead) => {
    const createdAt = getLeadCreatedAt(lead);
    return createdAt
      ? createdAt.getTime() >= startOfDay(range.from).getTime() && createdAt.getTime() <= startOfDay(range.to).getTime()
      : false;
  });

  const weeks = groupBy(cohortLeads, (lead) => {
    const createdAt = getLeadCreatedAt(lead);
    if (!createdAt) return null;
    return toISODate(startOfWeek(createdAt));
  });

  return Array.from(weeks.entries())
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
    .map(([isoDate, items]) => {
      const leadsCount = items.length;
      const conversions = items.filter((lead) => isWonLead(lead, classification)).length;
      const conversionRate = leadsCount > 0 ? Math.round((conversions / leadsCount) * 10000) / 100 : 0;

      return {
        weekLabel: formatWeekLabel(new Date(isoDate)),
        date: isoDate,
        leads: leadsCount,
        conversions,
        pctWeek0: cumulativeConversionPct(items, classification, 6),
        pctWeek1: cumulativeConversionPct(items, classification, 13),
        pctWeek2: cumulativeConversionPct(items, classification, 20),
        pctWeek3: cumulativeConversionPct(items, classification, 27),
        pctMonth0: cumulativeConversionPct(items, classification, 29),
        pctMonth1: cumulativeConversionPct(items, classification, 59),
        conversionRate,
      };
    });
}

function buildCohortTotal(rows: CohortRow[]): CohortRow {
  const leads = rows.reduce((sum, row) => sum + row.leads, 0);
  const conversions = rows.reduce((sum, row) => sum + row.conversions, 0);
  const conversionRate = leads > 0 ? Math.round((conversions / leads) * 10000) / 100 : 0;

  const avg = (key: keyof CohortRow) => {
    if (rows.length === 0) return 0;
    const sumPct = rows.reduce((acc, row) => acc + (typeof row[key] === "number" ? (row[key] as number) : 0), 0);
    return Math.round((sumPct / rows.length) * 100) / 100;
  };

  return {
    weekLabel: "Total do período",
    leads,
    conversions,
    pctWeek0: avg("pctWeek0"),
    pctWeek1: avg("pctWeek1"),
    pctWeek2: avg("pctWeek2"),
    pctWeek3: avg("pctWeek3"),
    pctMonth0: avg("pctMonth0"),
    pctMonth1: avg("pctMonth1"),
    conversionRate,
  };
}

function buildLeadsWonOverTime(leads: KommoLead[], range: DateRange, classification: StatusClassification): TimeSeriesPoint[] {
  const wonLeads = leads.filter((lead) => {
    if (!isWonLead(lead, classification)) return false;
    const wonAt = getLeadClosedAt(lead);
    return !!wonAt && wonAt.getTime() >= startOfDay(range.from).getTime() && wonAt.getTime() <= startOfDay(range.to).getTime();
  });

  const grouped = groupBy(wonLeads, (lead) => {
    const wonAt = getLeadClosedAt(lead);
    return wonAt ? `${formatMonthYear(wonAt)}|${wonAt.getFullYear()}-${String(wonAt.getMonth() + 1).padStart(2, "0")}` : null;
  });

  return Array.from(grouped.entries())
    .map(([key, items]) => {
      const [label] = key.split("|");
      return { label, value: items.length, date: `${key.split("|")[1]}-01` };
    })
    .sort((a, b) => (a.date! < b.date! ? -1 : a.date! > b.date! ? 1 : 0));
}

function leadMatchesRankingRange(lead: KommoLead, range: DateRange, classification: StatusClassification): boolean {
  const createdAt = getLeadCreatedAt(lead);
  const closedAt = getLeadClosedAt(lead);
  const createdInRange =
    !!createdAt &&
    createdAt.getTime() >= startOfDay(range.from).getTime() &&
    createdAt.getTime() <= startOfDay(range.to).getTime();
  const closedInRange =
    !!closedAt &&
    closedAt.getTime() >= startOfDay(range.from).getTime() &&
    closedAt.getTime() <= startOfDay(range.to).getTime();

  if (isWonLead(lead, classification)) {
    return closedInRange || createdInRange;
  }

  return createdInRange;
}

function buildRanking(
  leads: KommoLead[],
  range: DateRange,
  classification: StatusClassification,
  catalog: FieldCatalog,
  primaryExtractor: (lead: KommoLead, catalog: FieldCatalog) => string | null,
  secondaryExtractor: (lead: KommoLead, catalog: FieldCatalog) => string | null,
  emptyLabel: string,
): RankingRow[] {
  const inRange = leads.filter((lead) => leadMatchesRankingRange(lead, range, classification));

  const groups = groupBy(inRange, (lead) => {
    const primary = primaryExtractor(lead, catalog) ?? emptyLabel;
    const secondary = secondaryExtractor(lead, catalog) ?? "";
    return `${primary}\0${secondary}`;
  });

  const sorted = Array.from(groups.entries())
    .map(([composite, items]) => {
      const [primary, secondaryRaw] = composite.split("\0");
      return {
        primary,
        secondary: secondaryRaw || null,
        value: items.length,
      };
    })
    .sort((a, b) => b.value - a.value)
    .slice(0, 10)
    .map((item, index) => ({ ...item, rank: index + 1 }));

  return sorted;
}

function buildKommoMetrics(
  leads: KommoLead[],
  range: DateRange,
  classification: StatusClassification,
  catalog: FieldCatalog,
): WidgetPresetMetrics {
  const uniqueLeads = dedupeKommoLeads(leads);
  const createdLeads = uniqueLeads.filter((lead) => {
    const createdAt = getLeadCreatedAt(lead);
    return !!createdAt && createdAt.getTime() >= startOfDay(range.from).getTime() && createdAt.getTime() <= startOfDay(range.to).getTime();
  });

  const convertedLeads = createdLeads.filter((lead) => isWonLead(lead, classification)).length;
  const conversionRate = createdLeads.length > 0 ? Math.round((convertedLeads / createdLeads.length) * 10000) / 100 : 0;
  const appointments = uniqueLeads.filter((lead) => {
    const appointmentAt = getLeadNextActivityAt(lead);
    return !!appointmentAt && appointmentAt.getTime() >= startOfDay(range.from).getTime() && appointmentAt.getTime() <= startOfDay(range.to).getTime();
  }).length;
  const cohort = buildCohortRows(uniqueLeads, range, classification);

  return {
    periodLabel: `${toISODate(range.from)} — ${toISODate(range.to)}`,
    newLeads: createdLeads.length,
    conversionRate,
    appointments,
    cohort: cohort.length ? cohort : [],
    cohortTotal: buildCohortTotal(cohort),
    leadsWonOverTime: buildLeadsWonOverTime(uniqueLeads, range, classification),
    closedByLocation: buildRanking(
      uniqueLeads,
      range,
      classification,
      catalog,
      getLeadLocation,
      getLeadLocationSecondary,
      "Sem local",
    ),
    closedByOrigin: buildRanking(
      uniqueLeads,
      range,
      classification,
      catalog,
      getLeadOrigin,
      getLeadOriginSecondary,
      "Sem origem",
    ),
  };
}

async function fetchAllKommoLeads(): Promise<KommoLead[]> {
  const leads: KommoLead[] = [];
  let page = 1;
  let totalPages = 1;

  while (page <= totalPages) {
    const response = await kommoFetch<KommoLeadsResponse>(
      `/leads?limit=${KOMMO_LEADS_PAGE_LIMIT}&page=${page}&with=source,contacts`,
    );
    const pageLeads = Array.isArray(response._embedded?.leads) ? response._embedded.leads : [];
    leads.push(...pageLeads);

    const totalItems = response._page?.total ?? pageLeads.length;
    totalPages = Math.max(1, Math.ceil(totalItems / KOMMO_LEADS_PAGE_LIMIT));
    if (page >= totalPages) break;
    page += 1;
  }

  return dedupeKommoLeads(leads);
}

export async function fetchKommoSummary(): Promise<KommoSummary> {
  if (!isKommoConfigured()) {
    return {
      configured: false,
      leadsTotal: 0,
      pipelineApprox: 0,
    };
  }

  try {
    const data = await kommoFetch<KommoLeadsResponse>("/leads?limit=1&page=1");
    const total = data._page?.total ?? (Array.isArray(data._embedded?.leads) ? data._embedded!.leads!.length : 0);

    return {
      configured: true,
      leadsTotal: typeof total === "number" ? total : 0,
      pipelineApprox: Math.round((typeof total === "number" ? total : 0) * 1200),
    };
  } catch {
    return {
      configured: true,
      leadsTotal: 0,
      pipelineApprox: 0,
    };
  }
}

function isMetricCacheFresh(updatedAt?: string): boolean {
  if (!updatedAt) return false;
  const date = new Date(updatedAt);
  if (Number.isNaN(date.getTime())) return false;
  const ageMinutes = (Date.now() - date.getTime()) / 1000 / 60;
  return ageMinutes < Math.max(5, CACHE_TTL_MINUTES);
}

export async function invalidateWidgetPresetCache(userId: string): Promise<void> {
  const { settings } = await getDashboardExtras(userId);
  await saveDashboardSettings(userId, {
    ...settings,
    widgetPresetCache: undefined,
    widgetPresetCacheUpdatedAt: undefined,
    widgetPresetCachePeriodFrom: undefined,
    widgetPresetCachePeriodTo: undefined,
  });
}

export async function getWidgetPresetMetrics(
  userId: string,
  settings: DashboardSettings,
  range: DateRange,
  options?: { bustCache?: boolean },
): Promise<WidgetPresetMetrics> {
  const cachedRangeMatches =
    !options?.bustCache &&
    settings.widgetPresetCache &&
    settings.widgetPresetCachePeriodFrom === toISODate(range.from) &&
    settings.widgetPresetCachePeriodTo === toISODate(range.to) &&
    isMetricCacheFresh(settings.widgetPresetCacheUpdatedAt);

  if (cachedRangeMatches && settings.widgetPresetCache) {
    return settings.widgetPresetCache;
  }

  if (options?.bustCache) {
    fieldCatalogCache = null;
  }

  if (!isKommoConfigured()) {
    throw new Error("Kommo não está configurado");
  }

  const verified = await verifyKommoConnection();
  if (!verified.ok) {
    throw new Error(verified.error ?? "Falha ao conectar com Kommo");
  }

  const classification = await fetchPipelineClassification();
  const catalog = await fetchLeadFieldCatalog();
  const leads = await fetchAllKommoLeads();
  const metrics = buildKommoMetrics(leads, range, classification, catalog);

  await saveDashboardSettings(userId, {
    ...settings,
    widgetPresetCache: metrics,
    widgetPresetCacheUpdatedAt: new Date().toISOString(),
    widgetPresetCachePeriodFrom: toISODate(range.from),
    widgetPresetCachePeriodTo: toISODate(range.to),
  });

  return metrics;
}

export async function refreshKommoMetricsForUser(userId: string): Promise<WidgetPresetMetrics> {
  const { settings } = await getDashboardExtras(userId);
  const from = parseISODate(settings.widgetPresetCachePeriodFrom ?? settings.periodFrom ?? undefined) ?? DEFAULT_DATE_RANGE.from;
  const to = parseISODate(settings.widgetPresetCachePeriodTo ?? settings.periodTo ?? undefined) ?? DEFAULT_DATE_RANGE.to;

  await invalidateWidgetPresetCache(userId);
  const freshSettings = (await getDashboardExtras(userId)).settings;
  return getWidgetPresetMetrics(userId, freshSettings, { from, to }, { bustCache: true });
}

export async function refreshKommoMetricsForAllDashboards() {
  if (!isKommoConfigured()) {
    throw new Error("Kommo não está configurado");
  }

  pipelineClassificationCache = null;
  fieldCatalogCache = null;
  const classification = await fetchPipelineClassification();
  const catalog = await fetchLeadFieldCatalog();
  const leads = await fetchAllKommoLeads();
  const dashboards = await prisma.dashboard.findMany({ select: { userId: true, settings: true } });

  const updates = dashboards
    .filter((dashboard): dashboard is typeof dashboard & { userId: string } => Boolean(dashboard.userId))
    .map(async (dashboard) => {
      const settings = dashboard.settings as DashboardSettings;
      const from =
        parseISODate(settings.widgetPresetCachePeriodFrom ?? settings.periodFrom ?? undefined) ??
        DEFAULT_DATE_RANGE.from;
      const to =
        parseISODate(settings.widgetPresetCachePeriodTo ?? settings.periodTo ?? undefined) ?? DEFAULT_DATE_RANGE.to;
      const metrics = buildKommoMetrics(leads, { from, to }, classification, catalog);

      return saveDashboardSettings(dashboard.userId, {
        ...settings,
        widgetPresetCache: metrics,
        widgetPresetCacheUpdatedAt: new Date().toISOString(),
        widgetPresetCachePeriodFrom: toISODate(from),
        widgetPresetCachePeriodTo: toISODate(to),
      });
    });

  await Promise.all(updates);
  return dashboards.length;
}

export function isKommoRefreshSecretValid(providedSecret: string | null) {
  return Boolean(KOMMO_REFRESH_SECRET && providedSecret && KOMMO_REFRESH_SECRET === providedSecret);
}

export async function checkKommoHealth(): Promise<{
  ok: boolean;
  leadsTotal?: number;
  subdomain?: string;
  accountId?: number;
  error?: string;
}> {
  if (!isKommoConfigured()) {
    return { ok: false, error: "Kommo não configurado" };
  }

  const verified = await verifyKommoConnection();
  if (!verified.ok) {
    return { ok: false, error: verified.error };
  }

  try {
    const data = await kommoFetch<KommoLeadsResponse>("/leads?limit=1&page=1&with=contacts");
    const total = data._page?.total ?? 0;
    return {
      ok: true,
      leadsTotal: total,
      subdomain: verified.subdomain,
      accountId: verified.accountId,
    };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Erro desconhecido" };
  }
}
