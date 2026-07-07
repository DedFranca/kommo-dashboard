import type { RawTable } from "@/types/analytics";
import type { KommoLeadRecord } from "@/types/kommo-lead-record";

export const KOMMO_LEAD_ID_FIELD = "ID";

export function getKommoLeadId(value: unknown): string | null {
  if (value == null || value === "") return null;
  const id = String(value).trim();
  return /^\d+$/.test(id) ? id : null;
}

export function getKommoLeadIdFromRow(row: Record<string, string | null>): string | null {
  return getKommoLeadId(row[KOMMO_LEAD_ID_FIELD]);
}

type LeadLike = {
  id?: string | number;
  updated_at?: string | number;
  date_update?: string | number;
  [key: string]: unknown;
};

function leadUpdatedMs(lead: LeadLike): number {
  const raw = lead.updated_at ?? lead.date_update;
  if (raw == null) return 0;
  if (typeof raw === "number") {
    const ms = raw < 1e12 ? raw * 1000 : raw;
    return Number.isFinite(ms) ? ms : 0;
  }
  const parsed = Date.parse(String(raw));
  return Number.isNaN(parsed) ? 0 : parsed;
}

/** Mantém um registro por ID (o mais recente por data de atualização). */
export function dedupeKommoLeads<T extends LeadLike>(leads: T[]): T[] {
  const byId = new Map<string, T>();
  for (const lead of leads) {
    const id = getKommoLeadId(lead.id);
    if (!id) continue;
    const existing = byId.get(id);
    if (!existing || leadUpdatedMs(lead) >= leadUpdatedMs(existing)) {
      byId.set(id, lead);
    }
  }
  return Array.from(byId.values());
}

function recordUpdatedMs(record: KommoLeadRecord): number {
  const raw = record.Data_Atualizacao;
  if (!raw) return 0;
  const parsed = parseBrDateTime(raw);
  return parsed ? parsed.getTime() : 0;
}

/** Parse "dd/mm/yyyy, hh:mm:ss" ou "d/m/yyyy, h:mm:ss" (formato do export Kommo/CSV). */
export function parseBrDateTime(value: string): Date | null {
  const trimmed = value.trim();
  const match = /^(\d{1,2})\/(\d{1,2})\/(\d{4}),?\s*(\d{1,2}):(\d{2}):(\d{2})$/.exec(trimmed);
  if (!match) return null;
  const [, dd, mm, yyyy, hh, min, ss] = match;
  const date = new Date(Number(yyyy), Number(mm) - 1, Number(dd), Number(hh), Number(min), Number(ss));
  return Number.isNaN(date.getTime()) ? null : date;
}

export function dedupeKommoLeadRecords(records: KommoLeadRecord[]): KommoLeadRecord[] {
  const byId = new Map<string, KommoLeadRecord>();
  for (const record of records) {
    const id = getKommoLeadId(record.ID);
    if (!id) continue;
    const existing = byId.get(id);
    if (!existing || recordUpdatedMs(record) >= recordUpdatedMs(existing)) {
      byId.set(id, record);
    }
  }
  return Array.from(byId.values());
}

export function dedupeRawTableByLeadId(table: RawTable): RawTable {
  if (!table.columns.includes(KOMMO_LEAD_ID_FIELD)) return table;
  const byId = new Map<string, Record<string, string | null>>();
  for (const row of table.rows) {
    const id = getKommoLeadIdFromRow(row);
    if (!id) continue;
    const existing = byId.get(id);
    if (!existing) {
      byId.set(id, row);
      continue;
    }
    const existingMs = parseBrDateTime(existing.Data_Atualizacao ?? "")?.getTime() ?? 0;
    const currentMs = parseBrDateTime(row.Data_Atualizacao ?? "")?.getTime() ?? 0;
    if (currentMs >= existingMs) byId.set(id, row);
  }
  return { columns: table.columns, rows: Array.from(byId.values()) };
}

/** Conta leads únicos (por ID) que satisfazem o predicado. */
export function countUniqueLeadIds<T extends LeadLike>(
  leads: T[],
  predicate?: (lead: T) => boolean,
): number {
  const ids = new Set<string>();
  for (const lead of leads) {
    if (predicate && !predicate(lead)) continue;
    const id = getKommoLeadId(lead.id);
    if (id) ids.add(id);
  }
  return ids.size;
}
