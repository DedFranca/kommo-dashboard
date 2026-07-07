import { fetchAllKommoLeadRecords, leadRecordToDate } from "@/services/kommo-leads.service";
import { dedupeRawTableByLeadId } from "@/lib/kommo/lead-dedupe";
import type { KommoClientConfig } from "@/lib/kommo/client";
import type { KommoLeadRecord } from "@/types/kommo-lead-record";
import type { RawTable } from "@/types/analytics";
import type { WidgetDateRange, WidgetFilter } from "@/types/widget-query";
import type { DateRange } from "@/lib/date-range";
import { endOfDay } from "@/lib/date-range";

export function kommoRecordsToRawTable(records: KommoLeadRecord[]): RawTable {
  if (!records.length) return { columns: [], rows: [] };
  const columns = Object.keys(records[0]!).filter((k) => k !== "reference");
  return {
    columns,
    rows: records.map((record) => {
      const row: Record<string, string | null> = {};
      for (const col of columns) {
        const val = record[col as keyof KommoLeadRecord];
        row[col] = val == null ? null : String(val);
      }
      return row;
    }),
  };
}

function parseRowDate(value: string | null): Date | null {
  if (!value) return null;
  return leadRecordToDate(value);
}

function isFilterValueEmpty(filter: WidgetFilter): boolean {
  const v = filter.value;
  if (Array.isArray(v)) return v.length === 0 || v.every((x) => !String(x).trim());
  return !String(v ?? "").trim();
}

function applyRowFilter(row: Record<string, string | null>, filter: WidgetFilter): boolean {
  const raw = row[filter.field];
  const str = raw ?? "";

  switch (filter.operator) {
    case "eq":
      return str.toLowerCase() === String(filter.value).toLowerCase();
    case "neq":
      return str.toLowerCase() !== String(filter.value).toLowerCase();
    case "contains":
      return str.toLowerCase().includes(String(filter.value).toLowerCase());
    case "in": {
      const values = Array.isArray(filter.value) ? filter.value : [filter.value];
      return values.some((v) => str.toLowerCase() === String(v).toLowerCase());
    }
    case "gt": {
      const n = Number(str.replace(",", "."));
      return Number.isFinite(n) && n > Number(filter.value);
    }
    case "lt": {
      const n = Number(str.replace(",", "."));
      return Number.isFinite(n) && n < Number(filter.value);
    }
    default:
      return true;
  }
}

function resolveEffectiveDateRange(
  widgetRange: WidgetDateRange,
  globalRange: DateRange,
  defaultDateField: string | null,
): { field: string; from: Date; to: Date } | null {
  const field = widgetRange.field ?? defaultDateField;
  // Sem campo de data definido (ex.: dataset genérico em modo "herdar"),
  // não aplicamos filtro de período — evita descartar linhas silenciosamente.
  if (!field) return null;
  if (widgetRange.mode === "custom" && widgetRange.from && widgetRange.to) {
    const from = new Date(widgetRange.from);
    const to = new Date(widgetRange.to);
    if (!Number.isNaN(from.getTime()) && !Number.isNaN(to.getTime())) {
      return { field, from, to };
    }
  }
  return { field, from: globalRange.from, to: endOfDay(globalRange.to) };
}

export function filterRawTable(
  table: RawTable,
  filters: WidgetFilter[],
  dateRange: WidgetDateRange,
  globalRange: DateRange,
  defaultDateField: string | null = "Data_Criacao",
): RawTable {
  const effective = resolveEffectiveDateRange(dateRange, globalRange, defaultDateField);
  const rows = table.rows.filter((row) => {
    for (const f of filters) {
      if (isFilterValueEmpty(f)) continue;
      if (!applyRowFilter(row, f)) return false;
    }
    if (effective) {
      const d = parseRowDate(row[effective.field] ?? null);
      if (d) {
        if (d < effective.from || d > effective.to) return false;
      }
    }
    return true;
  });
  return { columns: table.columns, rows };
}

export async function fetchKommoRawTable(options?: {
  bustCache?: boolean;
  config?: KommoClientConfig;
}): Promise<RawTable> {
  const { records } = await fetchAllKommoLeadRecords({
    bustCache: options?.bustCache,
    config: options?.config,
  });
  return dedupeRawTableByLeadId(kommoRecordsToRawTable(records));
}
