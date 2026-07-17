import { prisma } from "@/lib/prisma";
import {
  endOfDay,
  getDefaultDateRange,
  formatMonthYear,
  formatRangeLabel,
  parseISODate,
  startOfDay,
  startOfWeek,
  toISODate,
  type DateRange,
} from "@/lib/date-range";
import { isKommoConfigured, kommoFetch, verifyKommoConnection } from "@/lib/kommo/client";
import { isKommoConfiguredForTenant, kommoFetchForTenant, verifyKommoForTenant } from "@/lib/kommo/tenant-client";
import { getDashboardExtras, saveDashboardSettings } from "@/services/data-source.service";
import type { DashboardSettings } from "@/types/data-source";
import type { KommoSummary } from "@/types/kommo-summary";
import type {
  CohortRow,
  DashboardMetrics,
  FunnelStage,
  HeatmapCell,
  RankingRow,
  ResponsiblePerformanceRow,
  TimeSeriesPoint,
} from "@/types/dashboard-metrics";
import type { DashboardFilters } from "@/types/dashboard-filters";
import { EMPTY_DASHBOARD_FILTERS } from "@/types/dashboard-filters";
import { GABARITO_LOST_STATUS_IDS, GABARITO_WON_STATUS_IDS } from "@/lib/kommo/gabarito";
import { buildExecutiveMetrics } from "@/lib/kommo/executive-metrics";
import { DASHBOARD_TREND_MONTHS } from "@/lib/date-range";
import { dedupeKommoLeads } from "@/lib/kommo/lead-dedupe";
import { toKommoCalendarDate } from "@/lib/kommo/kommo-dates";

type KommoLead = {
  id?: string | number;
  status_id?: number;
  pipeline_id?: number;
  responsible_user_id?: number;
  loss_reason_id?: number | null;
  source_id?: number;
  created_at?: string | number;
  date_create?: string | number;
  next_activity_at?: string | number;
  next_activity_date?: string | number;
  closed_at?: string | number;
  sale_amount?: number;
  price?: number;
  valor?: number;
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
  _page?: { total?: number; page?: number; limit?: number };
  _links?: { next?: { href?: string } };
};

type KommoPipelineStatus = {
  id: number;
  name?: string;
  type?: number;
  sort?: number;
};

type KommoPipeline = {
  id: number;
  name?: string;
  _embedded?: { statuses?: KommoPipelineStatus[] };
};

type KommoUsersResponse = {
  _embedded?: { users?: { id: number; name?: string }[] };
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
const KOMMO_WON_STATUS_IDS = parseNumberList(process.env.KOMMO_WON_STATUS_IDS).length
  ? parseNumberList(process.env.KOMMO_WON_STATUS_IDS)
  : Array.from(GABARITO_WON_STATUS_IDS);
const KOMMO_LOST_STATUS_IDS = parseNumberList(process.env.KOMMO_LOST_STATUS_IDS).length
  ? parseNumberList(process.env.KOMMO_LOST_STATUS_IDS)
  : Array.from(GABARITO_LOST_STATUS_IDS);
const KOMMO_REFRESH_SECRET = process.env.KOMMO_REFRESH_SECRET;
const KOMMO_LEADS_PAGE_LIMIT = 250;
const LEADS_FETCH_CONCURRENCY = Math.max(1, Math.min(10, Number(process.env.KOMMO_LEADS_FETCH_CONCURRENCY ?? "5")));

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
let pipelineNamesCache: Map<number, string> | null = null;
let statusNamesCache: Map<number, string> | null = null;
let usersCache: Map<number, string> | null = null;
let fieldCatalogCache: FieldCatalog | null = null;
let leadsDataCache: {
  leads: KommoLead[];
  apiTotal: number;
  fetchedAt: number;
  cacheKey: string;
} | null = null;
const PIPELINE_CACHE_TTL_MS = 10 * 60 * 1000;

type PipelinesMetadata = {
  classification: StatusClassification;
  pipelineNames: Map<number, string>;
  statusNames: Map<number, string>;
};

let pipelinesMetadataInflight: Promise<PipelinesMetadata> | null = null;
let pipelinesMetadataInflightKey: string | null = null;

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

function parseKommoTimestamp(value: unknown): Date | null {
  return toKommoCalendarDate(value);
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
  return parseKommoTimestamp(lead.created_at ?? lead.date_create ?? lead.createdAt ?? lead.dateCreated);
}

function getLeadClosedAt(lead: KommoLead): Date | null {
  return toKommoCalendarDate(lead.closed_at ?? lead.closedAt ?? lead.sale_at ?? lead.date_close);
}

function getLeadNextActivityAt(lead: KommoLead): Date | null {
  return (
    parseKommoTimestamp(lead.next_activity_at ?? lead.next_activity_date ?? lead.next_activity_time) ??
    parseKommoTimestamp(getLeadCustomFieldValue(lead, APPOINTMENT_FIELD_FRAGMENTS))
  );
}

function matchesStatusName(name: string | undefined, patterns: RegExp[]): boolean {
  if (!name) return false;
  const normalized = name.toLowerCase();
  return patterns.some((pattern) => pattern.test(normalized));
}

async function ensurePipelinesMetadata(
  tenantId?: string,
  integrationId?: string | null,
): Promise<PipelinesMetadata> {
  const key = `${tenantId ?? "env"}:${integrationId ?? ""}`;
  const now = Date.now();
  if (
    pipelineClassificationCache &&
    pipelineNamesCache &&
    statusNamesCache &&
    now - pipelineClassificationFetchedAt < PIPELINE_CACHE_TTL_MS
  ) {
    return {
      classification: pipelineClassificationCache,
      pipelineNames: pipelineNamesCache,
      statusNames: statusNamesCache,
    };
  }

  if (pipelinesMetadataInflight && pipelinesMetadataInflightKey === key) {
    return pipelinesMetadataInflight;
  }

  pipelinesMetadataInflightKey = key;
  pipelinesMetadataInflight = loadPipelinesMetadata(tenantId, integrationId).finally(() => {
    if (pipelinesMetadataInflightKey === key) {
      pipelinesMetadataInflight = null;
      pipelinesMetadataInflightKey = null;
    }
  });

  return pipelinesMetadataInflight;
}

async function loadPipelinesMetadata(
  tenantId?: string,
  integrationId?: string | null,
): Promise<PipelinesMetadata> {
  const now = Date.now();
  const wonIds = new Set(KOMMO_WON_STATUS_IDS);
  const lostIds = new Set(KOMMO_LOST_STATUS_IDS);
  const pipelineNames = new Map<number, string>();
  const statusNames = new Map<number, string>();

  const hasEnvClassification = wonIds.size > 0 || lostIds.size > 0;
  const needsPipelineApi = !hasEnvClassification || !pipelineNamesCache || !statusNamesCache;

  if (needsPipelineApi) {
    try {
      const data = await apiFetch<KommoPipelinesResponse>("/leads/pipelines", undefined, tenantId, integrationId);
      const pipelines = Array.isArray(data._embedded?.pipelines) ? data._embedded.pipelines : [];

      const wonPatterns = [/won|ganho|sucesso|closed won|vendido/i];
      const lostPatterns = [/lost|perdido|perda|closed lost|cancelad|descartad/i];

      for (const pipeline of pipelines) {
        if (pipeline.id && pipeline.name) pipelineNames.set(pipeline.id, pipeline.name);
        const statuses = Array.isArray(pipeline._embedded?.statuses) ? pipeline._embedded.statuses : [];
        for (const status of statuses) {
          if (status.id && status.name) statusNames.set(status.id, status.name);
        }

        if (!hasEnvClassification) {
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
      }
    } catch (error) {
      console.error("[kommo] Failed to fetch pipelines:", error instanceof Error ? error.message : error);
    }
  }

  const classification = { wonIds, lostIds };
  pipelineClassificationCache = classification;
  pipelineClassificationFetchedAt = now;
  if (pipelineNames.size > 0) pipelineNamesCache = pipelineNames;
  if (statusNames.size > 0) statusNamesCache = statusNames;

  return {
    classification,
    pipelineNames: pipelineNamesCache ?? pipelineNames,
    statusNames: statusNamesCache ?? statusNames,
  };
}

async function fetchPipelineClassification(
  tenantId?: string,
  integrationId?: string | null,
): Promise<StatusClassification> {
  return (await ensurePipelinesMetadata(tenantId, integrationId)).classification;
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

async function fetchStatusNamesMap(
  tenantId?: string,
  integrationId?: string | null,
): Promise<Map<number, string>> {
  return (await ensurePipelinesMetadata(tenantId, integrationId)).statusNames;
}

function kommoUnixSeconds(d: Date, end = false): number {
  const ts = end ? endOfDay(d) : startOfDay(d);
  return Math.floor(ts.getTime() / 1000);
}

function leadsCacheKey(_metricsRange?: DateRange): string {
  return "full";
}

type LeadQueryFilter = {
  createdFrom?: Date;
  createdTo?: Date;
  closedFrom?: Date;
  closedTo?: Date;
};

function buildLeadsListPath(page: number, filter: LeadQueryFilter): string {
  const params = new URLSearchParams();
  params.set("limit", String(KOMMO_LEADS_PAGE_LIMIT));
  params.set("page", String(page));
  if (filter.createdFrom) params.set("filter[created_at][from]", String(kommoUnixSeconds(filter.createdFrom)));
  if (filter.createdTo) params.set("filter[created_at][to]", String(kommoUnixSeconds(filter.createdTo, true)));
  if (filter.closedFrom) params.set("filter[closed_at][from]", String(kommoUnixSeconds(filter.closedFrom)));
  if (filter.closedTo) params.set("filter[closed_at][to]", String(kommoUnixSeconds(filter.closedTo, true)));
  return `/leads?${params.toString()}`;
}

async function apiFetch<T>(
  path: string,
  init?: RequestInit,
  tenantId?: string,
  integrationId?: string | null,
): Promise<T> {
  if (tenantId) return kommoFetchForTenant<T>(tenantId, path, init, integrationId);
  return kommoFetch<T>(path, init);
}

async function fetchKommoLeadsPages(
  filter: LeadQueryFilter,
  tenantId?: string,
  integrationId?: string | null,
): Promise<KommoLead[]> {
  const firstResponse = await apiFetch<KommoLeadsResponse>(
    buildLeadsListPath(1, filter),
    undefined,
    tenantId,
    integrationId,
  );
  const firstLeads = Array.isArray(firstResponse._embedded?.leads) ? firstResponse._embedded.leads : [];

  let totalPages = 1;
  if (typeof firstResponse._page?.total === "number" && firstResponse._page.total > 0) {
    const limit = firstResponse._page.limit ?? KOMMO_LEADS_PAGE_LIMIT;
    totalPages = Math.max(1, Math.ceil(firstResponse._page.total / limit));
  } else if (firstLeads.length < KOMMO_LEADS_PAGE_LIMIT) {
    return firstLeads;
  } else {
    return fetchKommoLeadsPagesSequential(filter, firstLeads, 2, tenantId, integrationId);
  }

  if (totalPages <= 1) return firstLeads;

  const pageNumbers = Array.from({ length: totalPages - 1 }, (_, index) => index + 2);
  const allLeads = [...firstLeads];

  for (let offset = 0; offset < pageNumbers.length; offset += LEADS_FETCH_CONCURRENCY) {
    const batch = pageNumbers.slice(offset, offset + LEADS_FETCH_CONCURRENCY);
    const responses = await Promise.all(
      batch.map((page) =>
        apiFetch<KommoLeadsResponse>(buildLeadsListPath(page, filter), undefined, tenantId, integrationId),
      ),
    );
    for (const response of responses) {
      const pageLeads = Array.isArray(response._embedded?.leads) ? response._embedded.leads : [];
      allLeads.push(...pageLeads);
    }
  }

  return dedupeKommoLeads(allLeads);
}

/** Fallback quando a API não informa o total de páginas. */
async function fetchKommoLeadsPagesSequential(
  filter: LeadQueryFilter,
  leads: KommoLead[],
  startPage: number,
  tenantId?: string,
  integrationId?: string | null,
): Promise<KommoLead[]> {
  let page = startPage;
  let totalPages = page;

  while (page <= totalPages) {
    const response = await apiFetch<KommoLeadsResponse>(
      buildLeadsListPath(page, filter),
      undefined,
      tenantId,
      integrationId,
    );
    const pageLeads = Array.isArray(response._embedded?.leads) ? response._embedded.leads : [];
    leads.push(...pageLeads);

    if (typeof response._page?.total === "number") {
      const limit = response._page.limit ?? KOMMO_LEADS_PAGE_LIMIT;
      totalPages = Math.max(totalPages, Math.ceil(response._page.total / limit));
    }

    if (pageLeads.length < KOMMO_LEADS_PAGE_LIMIT) break;
    page += 1;
  }

  return dedupeKommoLeads(leads);
}

async function fetchAllKommoLeadsScoped(
  tenantId?: string,
  integrationId?: string | null,
): Promise<{ leads: KommoLead[]; apiTotal: number }> {
  const leads: KommoLead[] = [];
  let path: string | null = `/leads?limit=${KOMMO_LEADS_PAGE_LIMIT}&page=1`;
  let apiTotal = 0;
  let page = 1;
  let totalPages = 1;

  while (path) {
    const response = await apiFetch<KommoLeadsResponse>(path, undefined, tenantId, integrationId);
    const pageLeads = Array.isArray(response._embedded?.leads) ? response._embedded.leads : [];
    leads.push(...pageLeads);

    if (typeof response._page?.total === "number") {
      apiTotal = response._page.total;
      const limit = response._page.limit ?? KOMMO_LEADS_PAGE_LIMIT;
      totalPages = Math.max(1, Math.ceil(apiTotal / limit));
    }

    const nextHref = response._links?.next?.href;
    if (nextHref) {
      path = kommoPathFromNextLink(nextHref);
    } else if (pageLeads.length >= KOMMO_LEADS_PAGE_LIMIT && page < totalPages) {
      page += 1;
      path = `/leads?limit=${KOMMO_LEADS_PAGE_LIMIT}&page=${page}`;
    } else {
      path = null;
    }
  }

  const deduped = dedupeKommoLeads(leads);
  const resolvedTotal = apiTotal > 0 ? apiTotal : deduped.length;
  if (apiTotal > 0 && deduped.length < apiTotal) {
    console.warn(`[kommo] Sincronizados ${deduped.length} de ${apiTotal} leads — verifique paginação ou limites da API.`);
  }

  return { leads: deduped, apiTotal: resolvedTotal };
}

function mergeLeadsById(...groups: KommoLead[][]): KommoLead[] {
  return dedupeKommoLeads(groups.flat());
}

async function fetchLeadsForMetricsRange(
  range: DateRange,
  tenantId?: string,
  integrationId?: string | null,
): Promise<{ leads: KommoLead[]; apiTotal: number }> {
  void range;
  return fetchAllKommoLeadsScoped(tenantId, integrationId);
}

async function getCachedLeads(
  bustCache: boolean,
  metricsRange?: DateRange,
  tenantId?: string,
  integrationId?: string | null,
): Promise<{ leads: KommoLead[]; apiTotal: number }> {
  const ttlMs = Math.max(5, CACHE_TTL_MINUTES) * 60 * 1000;
  const key = `${tenantId ?? "env"}:${integrationId ?? ""}:${leadsCacheKey(metricsRange)}`;
  if (
    !bustCache &&
    leadsDataCache &&
    leadsDataCache.cacheKey === key &&
    Date.now() - leadsDataCache.fetchedAt < ttlMs
  ) {
    return { leads: leadsDataCache.leads, apiTotal: leadsDataCache.apiTotal };
  }

  const result = metricsRange
    ? await fetchLeadsForMetricsRange(metricsRange, tenantId, integrationId)
    : await fetchAllKommoLeads();
  leadsDataCache = { ...result, fetchedAt: Date.now(), cacheKey: key };
  return result;
}

function hasActiveFilters(filters: DashboardFilters): boolean {
  return filters.pipelineIds.length > 0 || filters.responsibleIds.length > 0 || filters.statusIds.length > 0;
}

function filtersCacheKey(filters: DashboardFilters): string {
  const p = [...filters.pipelineIds].sort((a, b) => a - b).join(",");
  const r = [...filters.responsibleIds].sort((a, b) => a - b).join(",");
  const s = [...filters.statusIds].sort((a, b) => a - b).join(",");
  return `${p}|${r}|${s}`;
}

async function fetchPipelineNamesMap(
  tenantId?: string,
  integrationId?: string | null,
): Promise<Map<number, string>> {
  return (await ensurePipelinesMetadata(tenantId, integrationId)).pipelineNames;
}

async function fetchUsersMap(): Promise<Map<number, string>> {
  if (usersCache) return usersCache;
  const map = new Map<number, string>();
  try {
    const data = await kommoFetch<KommoUsersResponse>("/users");
    const users = Array.isArray(data._embedded?.users) ? data._embedded.users : [];
    for (const user of users) {
      if (user.id && user.name) map.set(user.id, user.name);
    }
  } catch (error) {
    console.error("[kommo] Failed to fetch users:", error instanceof Error ? error.message : error);
  }
  usersCache = map;
  return map;
}

function getLeadPipelineId(lead: KommoLead): number | undefined {
  const id = lead.pipeline_id ?? lead.pipelineId;
  return typeof id === "number" ? id : undefined;
}

function getLeadResponsibleId(lead: KommoLead): number | undefined {
  const id = lead.responsible_user_id ?? lead.responsibleUserId;
  return typeof id === "number" ? id : undefined;
}

function isLostLead(lead: KommoLead, classification: StatusClassification): boolean {
  return isStatusLost(lead.status_id, classification);
}

function leadInCreatedRange(lead: KommoLead, range: DateRange): boolean {
  const createdAt = getLeadCreatedAt(lead);
  if (!createdAt) return false;
  return inDateRange(createdAt, range);
}

function inDateRange(date: Date, range: DateRange): boolean {
  const t = startOfDay(date).getTime();
  return t >= startOfDay(range.from).getTime() && t <= endOfDay(range.to).getTime();
}

function buildTimeSeriesByMonth(
  leads: KommoLead[],
  range: DateRange,
  dateFn: (lead: KommoLead) => Date | null,
  filterFn?: (lead: KommoLead) => boolean,
): TimeSeriesPoint[] {
  const filtered = leads.filter((lead) => {
    if (filterFn && !filterFn(lead)) return false;
    const date = dateFn(lead);
    return !!date && date.getTime() >= startOfDay(range.from).getTime() && date.getTime() <= startOfDay(range.to).getTime();
  });

  const grouped = groupBy(filtered, (lead) => {
    const date = dateFn(lead);
    if (!date) return null;
    return `${formatMonthYear(date)}|${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
  });

  return Array.from(grouped.entries())
    .map(([key, items]) => {
      const [label] = key.split("|");
      return { label, value: items.length, date: `${key.split("|")[1]}-01` };
    })
    .sort((a, b) => (a.date! < b.date! ? -1 : a.date! > b.date! ? 1 : 0));
}

function buildConversionFunnel(
  leads: KommoLead[],
  range: DateRange,
  classification: StatusClassification,
): FunnelStage[] {
  const inRange = leads.filter((lead) => leadInCreatedRange(lead, range));
  const total = inRange.length;
  const won = inRange.filter((lead) => isWonLead(lead, classification)).length;
  const lost = inRange.filter((lead) => isLostLead(lead, classification)).length;
  const inProgress = Math.max(0, total - won - lost);

  const pct = (n: number) => (total > 0 ? Math.round((n / total) * 1000) / 10 : 0);

  return [
    { stage: "Leads criados", count: total, pct: 100 },
    { stage: "Em andamento", count: inProgress, pct: pct(inProgress) },
    { stage: "Vendas ganhas", count: won, pct: pct(won) },
    { stage: "Vendas perdidas", count: lost, pct: pct(lost) },
  ];
}

function buildLeadsOverTime(leads: KommoLead[], range: DateRange): TimeSeriesPoint[] {
  return buildTimeSeriesByMonth(leads, range, getLeadCreatedAt);
}

function buildSalesOverTime(
  leads: KommoLead[],
  range: DateRange,
  classification: StatusClassification,
): TimeSeriesPoint[] {
  return buildTimeSeriesByMonth(leads, range, getLeadClosedAt, (lead) => isWonLead(lead, classification));
}

function buildResponsiblePerformance(
  leads: KommoLead[],
  range: DateRange,
  classification: StatusClassification,
  usersMap: Map<number, string>,
): ResponsiblePerformanceRow[] {
  const inRange = leads.filter((lead) => leadInCreatedRange(lead, range));
  const groups = groupBy(inRange, (lead) => {
    const userId = getLeadResponsibleId(lead);
    return userId ? usersMap.get(userId) ?? `Usuário ${userId}` : "Sem responsável";
  });

  return Array.from(groups.entries())
    .map(([name, items]) => {
      const won = items.filter((lead) => isWonLead(lead, classification)).length;
      const leadsCount = items.length;
      return {
        name,
        leads: leadsCount,
        won,
        conversionRate: leadsCount > 0 ? Math.round((won / leadsCount) * 1000) / 10 : 0,
      };
    })
    .sort((a, b) => b.leads - a.leads)
    .slice(0, 8);
}

function buildPipelineDistribution(
  leads: KommoLead[],
  range: DateRange,
  pipelineMap: Map<number, string>,
): RankingRow[] {
  const inRange = leads.filter((lead) => leadInCreatedRange(lead, range));
  const groups = groupBy(inRange, (lead) => {
    const pipelineId = getLeadPipelineId(lead);
    return pipelineId ? pipelineMap.get(pipelineId) ?? `Pipeline ${pipelineId}` : "Sem pipeline";
  });

  return Array.from(groups.entries())
    .map(([primary, items], index) => ({
      rank: index + 1,
      primary,
      secondary: null,
      value: items.length,
    }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 10)
    .map((row, index) => ({ ...row, rank: index + 1 }));
}

function buildAvgClosingDays(
  leads: KommoLead[],
  range: DateRange,
  classification: StatusClassification,
): number {
  const wonInRange = leads.filter((lead) => {
    if (!isWonLead(lead, classification)) return false;
    const closedAt = getLeadClosedAt(lead);
    return !!closedAt && closedAt.getTime() >= startOfDay(range.from).getTime() && closedAt.getTime() <= startOfDay(range.to).getTime();
  });

  const durations = wonInRange
    .map((lead) => {
      const createdAt = getLeadCreatedAt(lead);
      const closedAt = getLeadClosedAt(lead);
      if (!createdAt || !closedAt) return null;
      return daysBetween(createdAt, closedAt);
    })
    .filter((d): d is number => d !== null);

  if (durations.length === 0) return 0;
  return Math.round(durations.reduce((a, b) => a + b, 0) / durations.length);
}

function buildLeadEntryHeatmap(leads: KommoLead[], range: DateRange): HeatmapCell[] {
  const inRange = leads.filter((lead) => leadInCreatedRange(lead, range));
  const grid = new Map<string, number>();

  for (const lead of inRange) {
    const createdAt = getLeadCreatedAt(lead);
    if (!createdAt) continue;
    const key = `${createdAt.getDay()}-${createdAt.getHours()}`;
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

function buildKommoMetrics(
  leads: KommoLead[],
  range: DateRange,
  classification: StatusClassification,
  pipelineMap: Map<number, string>,
  usersMap: Map<number, string>,
  statusMap: Map<number, string>,
  apiTotal: number,
  filters: DashboardFilters = EMPTY_DASHBOARD_FILTERS,
): DashboardMetrics {
  return buildExecutiveMetrics(
    leads,
    range,
    filters,
    classification,
    pipelineMap,
    usersMap,
    statusMap,
    apiTotal,
  );
}

function kommoPathFromNextLink(href: string): string | null {
  try {
    const url = new URL(href);
    const match = url.pathname.match(/\/api\/v4(\/.*)$/);
    if (match) return `${match[1]}${url.search}`;
    return `${url.pathname}${url.search}`;
  } catch {
    return null;
  }
}

async function fetchAllKommoLeads(): Promise<{ leads: KommoLead[]; apiTotal: number }> {
  return fetchAllKommoLeadsScoped();
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

function isValidMetricsCacheShape(cache: DashboardMetrics | undefined): cache is DashboardMetrics {
  return Boolean(
    cache &&
      Array.isArray(cache.chartLeadsMonth) &&
      cache.chartLeadsMonth.length >= DASHBOARD_TREND_MONTHS &&
      Array.isArray(cache.leadsOverTime) &&
      cache.leadsOverTime.length >= DASHBOARD_TREND_MONTHS &&
      cache.bestMonthLeadsAllTime !== undefined &&
      cache.bestMonthConsultasAllTime !== undefined &&
      typeof cache.totalLeads === "number" &&
      typeof cache.wonLeads === "number" &&
      typeof cache.monthlyRevenue === "number" &&
      cache.kpiDeltas &&
      cache.filterOptions,
  );
}

/** Lê métricas persistidas no dashboard (ignora TTL — útil para exibição instantânea). */
export function readStoredMetricsCache(
  settings: DashboardSettings,
  range: DateRange,
  filters: DashboardFilters = EMPTY_DASHBOARD_FILTERS,
): DashboardMetrics | null {
  const filterKey = filtersCacheKey(filters);
  const cachedFiltersKey =
    (settings as DashboardSettings & { kommoMetricsCacheFilters?: string }).kommoMetricsCacheFilters ?? "";

  if (
    !hasActiveFilters(filters) &&
    isValidMetricsCacheShape(settings.kommoMetricsCache) &&
    settings.kommoMetricsCachePeriodFrom === toISODate(range.from) &&
    settings.kommoMetricsCachePeriodTo === toISODate(range.to) &&
    cachedFiltersKey === filterKey
  ) {
    return settings.kommoMetricsCache;
  }

  return null;
}

function isLeadsMemoryCacheFresh(
  bustCache: boolean,
  metricsRange: DateRange | undefined,
  tenantId?: string,
  integrationId?: string | null,
): boolean {
  if (bustCache || !metricsRange || !leadsDataCache) return false;
  const ttlMs = Math.max(5, CACHE_TTL_MINUTES) * 60 * 1000;
  const key = `${tenantId ?? "env"}:${integrationId ?? ""}:${leadsCacheKey(metricsRange)}`;
  return leadsDataCache.cacheKey === key && Date.now() - leadsDataCache.fetchedAt < ttlMs;
}

export async function invalidateKommoMetricsCache(userId: string): Promise<void> {
  const { settings } = await getDashboardExtras(userId);
  await saveDashboardSettings(userId, {
    ...settings,
    kommoMetricsCache: undefined,
    kommoMetricsCacheUpdatedAt: undefined,
    kommoMetricsCachePeriodFrom: undefined,
    kommoMetricsCachePeriodTo: undefined,
    kommoMetricsCacheGrouping: undefined,
  });
}

/** Contexto de leads para Analytics (sem alterar cache do dashboard). */
export async function getKommoLeadsContext(
  bustCache = false,
  metricsRange?: DateRange,
  tenantId?: string,
  integrationId?: string | null,
) {
  const configured = tenantId
    ? await isKommoConfiguredForTenant(tenantId, integrationId)
    : isKommoConfigured();
  if (!configured) {
    throw new Error("Kommo não está configurado para este cliente");
  }
  const verified = tenantId
    ? await verifyKommoForTenant(tenantId, integrationId)
    : await verifyKommoConnection();
  if (!verified.ok) {
    throw new Error(verified.error ?? "Falha ao conectar com Kommo");
  }
  const [classification, statusMap, leadsResult] = await Promise.all([
    fetchPipelineClassification(tenantId, integrationId),
    fetchStatusNamesMap(tenantId, integrationId),
    getCachedLeads(bustCache, metricsRange, tenantId, integrationId),
  ]);
  const { leads, apiTotal } = leadsResult;
  return { leads, classification, statusMap, apiTotal };
}

export async function getKommoMetricsForUserRange(
  userId: string,
  settings: DashboardSettings,
  range: DateRange,
  options?: { bustCache?: boolean; filters?: DashboardFilters; tenantId?: string; integrationId?: string | null },
): Promise<DashboardMetrics> {
  const tenantId = options?.tenantId;
  const integrationId = options?.integrationId;
  const filters = options?.filters ?? EMPTY_DASHBOARD_FILTERS;
  const filterKey = filtersCacheKey(filters);
  const cachedFiltersKey = (settings as DashboardSettings & { kommoMetricsCacheFilters?: string }).kommoMetricsCacheFilters ?? "";
  const cachedIntegrationId = settings.kommoMetricsCacheIntegrationId ?? "";
  const integrationKey = integrationId ?? "";

  const cachedRangeMatches =
    !options?.bustCache &&
    !hasActiveFilters(filters) &&
    isValidMetricsCacheShape(settings.kommoMetricsCache) &&
    settings.kommoMetricsCachePeriodFrom === toISODate(range.from) &&
    settings.kommoMetricsCachePeriodTo === toISODate(range.to) &&
    cachedFiltersKey === filterKey &&
    cachedIntegrationId === integrationKey &&
    isMetricCacheFresh(settings.kommoMetricsCacheUpdatedAt);

  if (cachedRangeMatches && settings.kommoMetricsCache) {
    return settings.kommoMetricsCache;
  }

  if (options?.bustCache) {
    fieldCatalogCache = null;
    pipelineClassificationCache = null;
    pipelineClassificationFetchedAt = 0;
    pipelineNamesCache = null;
    statusNamesCache = null;
    usersCache = null;
    leadsDataCache = null;
    pipelinesMetadataInflight = null;
    pipelinesMetadataInflightKey = null;
  }

  const configured = tenantId
    ? await isKommoConfiguredForTenant(tenantId, integrationId)
    : isKommoConfigured();
  if (!configured) {
    throw new Error("Kommo não está configurado para este cliente");
  }

  const leadsMemoryFresh = isLeadsMemoryCacheFresh(Boolean(options?.bustCache), range, tenantId, integrationId);

  if (!leadsMemoryFresh) {
    const verified = tenantId
      ? await verifyKommoForTenant(tenantId, integrationId)
      : await verifyKommoConnection();
    if (!verified.ok) {
      throw new Error(verified.error ?? "Falha ao conectar com Kommo");
    }
  }

  const [pipelinesMeta, usersMap, leadsResult] = await Promise.all([
    ensurePipelinesMetadata(tenantId, integrationId),
    fetchUsersMap(),
    getCachedLeads(Boolean(options?.bustCache), range, tenantId, integrationId),
  ]);
  const { classification, pipelineNames: pipelineMap, statusNames: statusMap } = pipelinesMeta;
  const { leads, apiTotal } = leadsResult;
  const metrics = buildKommoMetrics(leads, range, classification, pipelineMap, usersMap, statusMap, apiTotal, filters);

  if (!hasActiveFilters(filters)) {
    await saveDashboardSettings(userId, {
      ...settings,
      kommoMetricsCache: metrics,
      kommoMetricsCacheUpdatedAt: new Date().toISOString(),
      kommoMetricsCachePeriodFrom: toISODate(range.from),
      kommoMetricsCachePeriodTo: toISODate(range.to),
      kommoMetricsCacheFilters: filterKey,
      kommoMetricsCacheIntegrationId: integrationId ?? null,
    } as DashboardSettings);
  }

  return metrics;
}

export async function refreshKommoMetricsForUser(userId: string): Promise<DashboardMetrics> {
  const { settings } = await getDashboardExtras(userId);
  const defaultRange = getDefaultDateRange();
  const from = parseISODate(settings.kommoMetricsCachePeriodFrom ?? settings.periodFrom ?? undefined) ?? defaultRange.from;
  const to = parseISODate(settings.kommoMetricsCachePeriodTo ?? settings.periodTo ?? undefined) ?? defaultRange.to;

  await invalidateKommoMetricsCache(userId);
  const freshSettings = (await getDashboardExtras(userId)).settings;
  return getKommoMetricsForUserRange(userId, freshSettings, { from, to }, { bustCache: true });
}

export async function refreshKommoMetricsForAllDashboards() {
  if (!isKommoConfigured()) {
    throw new Error("Kommo não está configurado");
  }

  pipelineClassificationCache = null;
  pipelineClassificationFetchedAt = 0;
  pipelineNamesCache = null;
  statusNamesCache = null;
  usersCache = null;
  leadsDataCache = null;
  pipelinesMetadataInflight = null;
  pipelinesMetadataInflightKey = null;
  const { classification, pipelineNames: pipelineMap, statusNames: statusMap } = await ensurePipelinesMetadata();
  const usersMap = await fetchUsersMap();
  const dashboards = await prisma.dashboard.findMany({ select: { userId: true, settings: true } });

  const updates = dashboards.map(async (dashboard) => {
    if (!dashboard.userId) return;
    const settings = dashboard.settings as DashboardSettings;
    const defaultRange = getDefaultDateRange();
    const from = parseISODate(settings.kommoMetricsCachePeriodFrom ?? settings.periodFrom ?? undefined) ?? defaultRange.from;
    const to = parseISODate(settings.kommoMetricsCachePeriodTo ?? settings.periodTo ?? undefined) ?? defaultRange.to;
    const userRange = { from, to };
    const { leads, apiTotal } = await getCachedLeads(true, userRange);
    const metrics = buildKommoMetrics(leads, userRange, classification, pipelineMap, usersMap, statusMap, apiTotal);

    return saveDashboardSettings(dashboard.userId, {
      ...settings,
      kommoMetricsCache: metrics,
      kommoMetricsCacheUpdatedAt: new Date().toISOString(),
      kommoMetricsCachePeriodFrom: toISODate(from),
      kommoMetricsCachePeriodTo: toISODate(to),
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
