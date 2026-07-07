import { kommoFetch, kommoFetchWithConfig, type KommoClientConfig } from "@/lib/kommo/client";
import {
  GABARITO_ACCOUNT,
  GABARITO_CUSTOM_FIELD_KEYS,
  GABARITO_LOST_STATUS_IDS,
  GABARITO_LOSS_REASONS,
  GABARITO_PIPELINES,
  GABARITO_STATUSES,
  GABARITO_USERS,
  GABARITO_WON_STATUS_IDS,
  type GabaritoCustomFieldKey,
} from "@/lib/kommo/gabarito";
import type { KommoReferenceData } from "@/types/kommo-lead-record";

type KommoPipelineStatus = { id: number; name?: string; sort?: number };
type KommoPipeline = { id: number; name?: string; _embedded?: { statuses?: KommoPipelineStatus[] } };
type KommoUser = { id: number; name?: string };
type KommoLossReason = { id: number; name?: string };
type KommoCustomFieldDef = { id: number; name?: string; code?: string | null };
type KommoAccount = { id?: number; name?: string; subdomain?: string };

const REFERENCE_CACHE_TTL_MS = 10 * 60 * 1000;
const referenceCacheByKey = new Map<string, { data: KommoReferenceData; at: number }>();

function cacheKeyForConfig(cfg?: KommoClientConfig): string {
  return cfg?.apiBaseUrl ?? "__env__";
}

function mergeMaps<T extends Record<number, string>>(staticMap: T, dynamic: Record<number, string>): Record<number, string> {
  return { ...staticMap, ...dynamic };
}

function normalizeLabel(value: unknown): string {
  if (typeof value !== "string" && typeof value !== "number") return "";
  return String(value).trim().toLowerCase();
}

function matchCustomFieldKey(name: string, code: string): GabaritoCustomFieldKey | null {
  const label = `${name} ${code}`.trim();
  for (const key of Object.keys(GABARITO_CUSTOM_FIELD_KEYS) as GabaritoCustomFieldKey[]) {
    const fragments = GABARITO_CUSTOM_FIELD_KEYS[key];
    if (fragments.some((f) => label.includes(f))) return key;
  }
  return null;
}

function buildCustomFieldMap(fields: KommoCustomFieldDef[]): Record<GabaritoCustomFieldKey, number[]> {
  const map = Object.fromEntries(
    Object.keys(GABARITO_CUSTOM_FIELD_KEYS).map((k) => [k, [] as number[]]),
  ) as Record<GabaritoCustomFieldKey, number[]>;

  for (const field of fields) {
    const key = matchCustomFieldKey(normalizeLabel(field.name), normalizeLabel(field.code));
    if (key && !map[key].includes(field.id)) map[key].push(field.id);
  }
  return map;
}

export function resolveName(map: Record<number, string>, id: number | null | undefined): string | null {
  if (id == null) return null;
  return map[id] ?? null;
}

export async function fetchKommoReferenceData(options?: {
  bustCache?: boolean;
  config?: KommoClientConfig;
}): Promise<KommoReferenceData> {
  const key = cacheKeyForConfig(options?.config);
  const now = Date.now();
  const cached = referenceCacheByKey.get(key);
  if (!options?.bustCache && cached && now - cached.at < REFERENCE_CACHE_TTL_MS) {
    return cached.data;
  }

  const fetcher = options?.config
    ? <T>(path: string) => kommoFetchWithConfig<T>(options.config!, path)
    : kommoFetch;

  const users: Record<number, string> = { ...GABARITO_USERS };
  const pipelines: Record<number, string> = { ...GABARITO_PIPELINES };
  const statuses: Record<number, string> = { ...GABARITO_STATUSES };
  const lossReasons: Record<number, string> = { ...GABARITO_LOSS_REASONS };
  let account = { id: GABARITO_ACCOUNT.id, name: GABARITO_ACCOUNT.name };
  let customFields = buildCustomFieldMap([]);

  const results = await Promise.allSettled([
    fetcher<{ id?: number; name?: string; subdomain?: string }>("/account"),
    fetcher<{ _embedded?: { users?: KommoUser[] } }>("/users"),
    fetcher<{ _embedded?: { pipelines?: KommoPipeline[] } }>("/leads/pipelines"),
    fetcher<{ _embedded?: { loss_reasons?: KommoLossReason[] } }>("/leads/loss_reasons"),
    fetcher<{ _embedded?: { custom_fields?: KommoCustomFieldDef[] } }>("/leads/custom_fields"),
  ]);

  const [accountRes, usersRes, pipelinesRes, lossRes, fieldsRes] = results;

  if (accountRes.status === "fulfilled") {
    const acc = accountRes.value as KommoAccount;
    account = {
      id: acc.id ?? GABARITO_ACCOUNT.id,
      name: acc.subdomain ?? acc.name ?? GABARITO_ACCOUNT.name,
    };
  }

  if (usersRes.status === "fulfilled") {
    for (const user of usersRes.value._embedded?.users ?? []) {
      if (user.id && user.name) users[user.id] = user.name;
    }
  }

  if (pipelinesRes.status === "fulfilled") {
    for (const pipeline of pipelinesRes.value._embedded?.pipelines ?? []) {
      if (pipeline.id && pipeline.name) pipelines[pipeline.id] = pipeline.name;
      for (const status of pipeline._embedded?.statuses ?? []) {
        if (status.id && status.name) statuses[status.id] = status.name;
      }
    }
  }

  if (lossRes.status === "fulfilled") {
    for (const reason of lossRes.value._embedded?.loss_reasons ?? []) {
      if (reason.id && reason.name) lossReasons[reason.id] = reason.name;
    }
  }

  if (fieldsRes.status === "fulfilled") {
    customFields = buildCustomFieldMap(fieldsRes.value._embedded?.custom_fields ?? []);
  }

  const data: KommoReferenceData = {
    account,
    users: mergeMaps(GABARITO_USERS, users),
    pipelines: mergeMaps(GABARITO_PIPELINES, pipelines),
    statuses: mergeMaps(GABARITO_STATUSES, statuses),
    lossReasons: mergeMaps(GABARITO_LOSS_REASONS, lossReasons),
    customFields,
    wonStatusIds: Array.from(GABARITO_WON_STATUS_IDS),
    lostStatusIds: Array.from(GABARITO_LOST_STATUS_IDS),
  };
  referenceCacheByKey.set(key, { data, at: now });
  return data;
}

export function clearKommoReferenceCache(config?: KommoClientConfig) {
  if (config) {
    referenceCacheByKey.delete(cacheKeyForConfig(config));
    return;
  }
  referenceCacheByKey.clear();
}

export function getWonStatusIds(reference: KommoReferenceData): Set<number> {
  const envWon = parseEnvIds(process.env.KOMMO_WON_STATUS_IDS);
  const ids = envWon.length ? envWon : reference.wonStatusIds;
  return new Set(ids);
}

export function getLostStatusIds(reference: KommoReferenceData): Set<number> {
  const envLost = parseEnvIds(process.env.KOMMO_LOST_STATUS_IDS);
  const ids = envLost.length ? envLost : reference.lostStatusIds;
  return new Set(ids);
}

function parseEnvIds(value: string | undefined): number[] {
  if (!value?.trim()) return [];
  return value.split(/[,;]+/).map((v) => Number(v.trim())).filter((n) => Number.isFinite(n));
}
