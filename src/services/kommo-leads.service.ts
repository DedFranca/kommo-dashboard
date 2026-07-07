import {
  kommoFetch,
  kommoFetchWithConfig,
  isKommoConfigured,
  verifyKommoConnection,
  verifyKommoConnectionWithConfig,
  type KommoClientConfig,
} from "@/lib/kommo/client";
import { kommoPathFromNextLink } from "@/lib/kommo/pagination";
import { GABARITO_CUSTOM_FIELD_KEYS, type GabaritoCustomFieldKey } from "@/lib/kommo/gabarito";
import { dedupeKommoLeadRecords, parseBrDateTime } from "@/lib/kommo/lead-dedupe";
import {
  fetchKommoReferenceData,
  resolveName,
  getWonStatusIds,
  getLostStatusIds,
} from "@/services/kommo-reference.service";
import type { KommoLeadRecord, KommoLeadsResponse, KommoReferenceData } from "@/types/kommo-lead-record";

const KOMMO_LEADS_PAGE_LIMIT = 250;

type RawKommoLead = {
  id?: number;
  name?: string;
  price?: number;
  status_id?: number;
  pipeline_id?: number;
  responsible_user_id?: number;
  group_id?: number;
  loss_reason_id?: number | null;
  created_by?: number;
  updated_by?: number;
  score?: number | null;
  labor_cost?: number | null;
  created_at?: number | string;
  updated_at?: number | string;
  closed_at?: number | string | null;
  closest_task_at?: number | string | null;
  is_deleted?: boolean;
  custom_fields_values?: unknown[];
  _embedded?: {
    contacts?: { id?: number; is_main?: boolean }[];
    companies?: { id?: number }[];
    tags?: { id?: number; name?: string }[];
    loss_reason?: { id?: number; name?: string };
  };
  [key: string]: unknown;
};

type KommoLeadsApiResponse = {
  _embedded?: { leads?: RawKommoLead[] };
  _page?: { total?: number; limit?: number };
  _links?: { next?: { href?: string } };
};

function parseTimestamp(value: unknown): Date | null {
  if (value == null) return null;
  if (typeof value === "number") {
    const ms = value < 1e12 ? value * 1000 : value;
    const d = new Date(ms);
    return Number.isNaN(d.getTime()) ? null : d;
  }
  if (typeof value === "string") {
    if (/^[0-9]+$/.test(value.trim())) return parseTimestamp(Number(value));
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? null : d;
  }
  return null;
}

/** Formato brasileiro como no CSV: "01/10/2025, 15:30:45" */
function formatKommoDate(value: unknown): string | null {
  const date = parseTimestamp(value);
  if (!date) return null;
  const dd = String(date.getDate()).padStart(2, "0");
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const yyyy = date.getFullYear();
  const hh = String(date.getHours()).padStart(2, "0");
  const min = String(date.getMinutes()).padStart(2, "0");
  const ss = String(date.getSeconds()).padStart(2, "0");
  return `${dd}/${mm}/${yyyy}, ${hh}:${min}:${ss}`;
}

function extractFieldText(field: unknown): string | null {
  if (!field || typeof field !== "object") return null;
  const record = field as Record<string, unknown>;
  const values = Array.isArray(record.values) ? record.values : record.value !== undefined ? [{ value: record.value }] : [];
  for (const item of values) {
    if (!item || typeof item !== "object") continue;
    const raw = (item as Record<string, unknown>).value;
    if (raw != null && String(raw).trim()) return String(raw).trim();
  }
  return null;
}

function getCustomFieldByIds(fields: unknown, ids: number[]): string | null {
  if (!Array.isArray(fields) || !ids.length) return null;
  const idSet = new Set(ids);
  for (const field of fields) {
    if (!field || typeof field !== "object") continue;
    const fieldId = Number((field as Record<string, unknown>).field_id);
    if (!idSet.has(fieldId)) continue;
    const text = extractFieldText(field);
    if (text) return text;
  }
  return null;
}

function getCustomFieldByFragments(fields: unknown, fragments: readonly string[]): string | null {
  if (!Array.isArray(fields)) return null;
  for (const field of fields) {
    if (!field || typeof field !== "object") continue;
    const record = field as Record<string, unknown>;
    const label = `${record.field_name ?? record.name ?? ""} ${record.field_code ?? record.code ?? ""}`.toLowerCase();
    if (!fragments.some((f) => label.includes(f))) continue;
    const text = extractFieldText(field);
    if (text) return text;
  }
  return null;
}

function getLeadCustomField(
  lead: RawKommoLead,
  key: GabaritoCustomFieldKey,
  reference: KommoReferenceData,
): string | null {
  const ids = reference.customFields[key] ?? [];
  const fragments = GABARITO_CUSTOM_FIELD_KEYS[key];

  const fromLead = getCustomFieldByIds(lead.custom_fields_values, ids) ?? getCustomFieldByFragments(lead.custom_fields_values, fragments);
  if (fromLead) return fromLead;

  for (const contact of lead._embedded?.contacts ?? []) {
    const contactFields = (contact as Record<string, unknown>).custom_fields_values;
    const fromContact = getCustomFieldByIds(contactFields, ids) ?? getCustomFieldByFragments(contactFields, fragments);
    if (fromContact) return fromContact;
  }
  return null;
}

function getMainContactId(lead: RawKommoLead): number | null {
  const contacts = lead._embedded?.contacts ?? [];
  const main = contacts.find((c) => c.is_main) ?? contacts[0];
  return main?.id ?? null;
}

function getPrimaryCompanyId(lead: RawKommoLead): number | null {
  const companies = lead._embedded?.companies ?? [];
  return companies[0]?.id ?? null;
}

function buildCustomFields(lead: RawKommoLead, reference: KommoReferenceData): Record<GabaritoCustomFieldKey, string | null> {
  const result = {} as Record<GabaritoCustomFieldKey, string | null>;
  for (const key of Object.keys(GABARITO_CUSTOM_FIELD_KEYS) as GabaritoCustomFieldKey[]) {
    result[key] = getLeadCustomField(lead, key, reference);
  }
  return result;
}

export function transformKommoLead(lead: RawKommoLead, reference: KommoReferenceData): KommoLeadRecord {
  const tags = lead._embedded?.tags ?? [];
  const tagNames = tags.map((t) => t.name).filter(Boolean).join(", ") || null;
  const tagIds = tags.map((t) => t.id).filter(Boolean).join(", ") || null;

  const lossReasonId = lead.loss_reason_id ?? lead._embedded?.loss_reason?.id ?? null;
  const updatedById = lead.updated_by ?? null;

  return {
    ID: lead.id ?? 0,
    Nome: lead.name ?? `Lead #${lead.id ?? "?"}`,
    Valor: typeof lead.price === "number" ? lead.price : 0,
    Status_ID: lead.status_id ?? null,
    Status_Nome: resolveName(reference.statuses, lead.status_id),
    Pipeline_ID: lead.pipeline_id ?? null,
    Pipeline_Nome: resolveName(reference.pipelines, lead.pipeline_id),
    Responsavel_ID: lead.responsible_user_id ?? null,
    Responsavel_Nome: resolveName(reference.users, lead.responsible_user_id),
    Account_ID: reference.account.id,
    Account_Nome: reference.account.name,
    Group_ID: lead.group_id ?? null,
    Loss_Reason_ID: lossReasonId,
    Loss_Reason_Nome:
      resolveName(reference.lossReasons, lossReasonId) ??
      (lead._embedded?.loss_reason?.name ?? null),
    Criado_Por: lead.created_by ?? null,
    Atualizado_Por: updatedById,
    Atualizado_Por_Nome: resolveName(reference.users, updatedById),
    Score: lead.score ?? null,
    Custo_Trabalho: lead.labor_cost ?? null,
    Data_Criacao: formatKommoDate(lead.created_at),
    Data_Atualizacao: formatKommoDate(lead.updated_at),
    Data_Fechamento: formatKommoDate(lead.closed_at),
    Proxima_Tarefa: formatKommoDate(lead.closest_task_at),
    Perdido: lead.is_deleted ? "SIM" : "NÃO",
    Tags: tagNames,
    Tags_IDs: tagIds,
    Contato_Principal_ID: getMainContactId(lead),
    Total_Contatos: lead._embedded?.contacts?.length ?? 0,
    Empresa_ID: getPrimaryCompanyId(lead),
    Total_Empresas: lead._embedded?.companies?.length ?? 0,
    ...buildCustomFields(lead, reference),
  };
}

export function isLeadWon(record: KommoLeadRecord, reference: KommoReferenceData): boolean {
  const wonIds = getWonStatusIds(reference);
  return record.Status_ID != null && wonIds.has(record.Status_ID);
}

export function isLeadLost(record: KommoLeadRecord, reference: KommoReferenceData): boolean {
  const lostIds = getLostStatusIds(reference);
  if (record.Status_ID != null && lostIds.has(record.Status_ID)) return true;
  return record.Loss_Reason_ID != null && record.Loss_Reason_ID > 0;
}

const LEADS_WITH_PARAMS = "contacts,companies,tags,loss_reason,source";

const LEADS_RECORDS_CACHE_TTL_MS =
  Math.max(5, Number(process.env.KOMMO_METRICS_CACHE_TTL_MINUTES ?? "20")) * 60 * 1000;

const leadsRecordsCache = new Map<
  string,
  { records: KommoLeadRecord[]; reference: KommoReferenceData; total: number; fetchedAt: number }
>();

function recordsCacheKey(config?: KommoClientConfig): string {
  return config?.apiBaseUrl ?? "__env__";
}

export function clearKommoLeadRecordsCache(config?: KommoClientConfig) {
  if (config) leadsRecordsCache.delete(recordsCacheKey(config));
  else leadsRecordsCache.clear();
}

async function fetchRawKommoLeads(config?: KommoClientConfig): Promise<RawKommoLead[]> {
  const fetcher = config
    ? <T>(path: string) => kommoFetchWithConfig<T>(config, path)
    : kommoFetch;

  const leads: RawKommoLead[] = [];
  let path: string | null = `/leads?limit=${KOMMO_LEADS_PAGE_LIMIT}&page=1&with=${LEADS_WITH_PARAMS}`;
  let page = 1;
  let totalPages = 1;

  while (path) {
    const response = await fetcher<KommoLeadsApiResponse>(path);
    const pageLeads = response._embedded?.leads ?? [];
    leads.push(...pageLeads);

    if (typeof response._page?.total === "number" && response._page.total > 0) {
      const limit = response._page.limit ?? KOMMO_LEADS_PAGE_LIMIT;
      totalPages = Math.max(1, Math.ceil(response._page.total / limit));
    }

    const nextHref = response._links?.next?.href;
    if (nextHref) {
      path = kommoPathFromNextLink(nextHref);
    } else if (pageLeads.length >= KOMMO_LEADS_PAGE_LIMIT && page < totalPages) {
      page += 1;
      path = `/leads?limit=${KOMMO_LEADS_PAGE_LIMIT}&page=${page}&with=${LEADS_WITH_PARAMS}`;
    } else {
      path = null;
    }
  }

  return leads;
}

/** Retorna todos os leads normalizados (sem paginação). */
export async function fetchAllKommoLeadRecords(options?: {
  bustCache?: boolean;
  config?: KommoClientConfig;
}): Promise<{ records: KommoLeadRecord[]; reference: KommoReferenceData; total: number }> {
  const config = options?.config;
  const cacheKey = recordsCacheKey(config);
  const cached = leadsRecordsCache.get(cacheKey);
  if (
    !options?.bustCache &&
    cached &&
    Date.now() - cached.fetchedAt < LEADS_RECORDS_CACHE_TTL_MS
  ) {
    return { records: cached.records, reference: cached.reference, total: cached.total };
  }

  const configured = config ? true : isKommoConfigured();
  if (!configured) {
    throw new Error("Kommo não está configurado");
  }

  const verified = config
    ? await verifyKommoConnectionWithConfig(config)
    : await verifyKommoConnection();
  if (!verified.ok) {
    throw new Error(verified.error ?? "Falha ao conectar com Kommo");
  }

  const reference = await fetchKommoReferenceData({ bustCache: options?.bustCache, config });
  const rawLeads = await fetchRawKommoLeads(config);
  const records = dedupeKommoLeadRecords(rawLeads.map((lead) => transformKommoLead(lead, reference)));
  const result = { records, reference, total: records.length };
  leadsRecordsCache.set(cacheKey, { ...result, fetchedAt: Date.now() });
  return result;
}

export async function fetchKommoLeadRecords(options?: {
  bustCache?: boolean;
  page?: number;
  limit?: number;
  config?: KommoClientConfig;
}): Promise<KommoLeadsResponse> {
  const config = options?.config;
  const configured = config ? true : isKommoConfigured();
  if (!configured) {
    throw new Error("Kommo não está configurado");
  }

  const verified = config
    ? await verifyKommoConnectionWithConfig(config)
    : await verifyKommoConnection();
  if (!verified.ok) {
    throw new Error(verified.error ?? "Falha ao conectar com Kommo");
  }

  const reference = await fetchKommoReferenceData({ bustCache: options?.bustCache, config });
  const rawLeads = await fetchRawKommoLeads(config);
  const allRecords = rawLeads.map((lead) => transformKommoLead(lead, reference));

  const page = Math.max(1, options?.page ?? 1);
  const limit = Math.min(500, Math.max(1, options?.limit ?? 250));
  const start = (page - 1) * limit;
  const records = allRecords.slice(start, start + limit);

  return {
    total: allRecords.length,
    page,
    limit,
    records,
    reference,
  };
}

/** Converte registro plano de volta para uso interno nas métricas. */
export function leadRecordToDate(value: string | null): Date | null {
  if (!value) return null;
  const br = parseBrDateTime(value);
  if (br) return br;
  return parseTimestamp(value);
}

export type { RawKommoLead };
