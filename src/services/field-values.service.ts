import type { KommoClientConfig } from "@/lib/kommo/client";
import type { DateRange } from "@/lib/date-range";
import { getRawDataset } from "@/services/analytics-datasets.service";
import { fetchKommoReferenceData } from "@/services/kommo-reference.service";
import { fetchKommoRawTable, filterRawTable } from "@/services/kommo-table.service";
import type { RawTable } from "@/types/analytics";
import type { KommoReferenceData } from "@/types/kommo-lead-record";
import type { WidgetDataSource } from "@/types/widget-query";

const MAX_DISTINCT = 250;

const REFERENCE_FIELD_MAP: Partial<
  Record<string, keyof Pick<KommoReferenceData, "pipelines" | "statuses" | "users" | "lossReasons">>
> = {
  Pipeline_Nome: "pipelines",
  Status_Nome: "statuses",
  Responsavel_Nome: "users",
  Loss_Reason_Nome: "lossReasons",
  Atualizado_Por_Nome: "users",
};

const STATIC_FIELD_VALUES: Record<string, string[]> = {
  Perdido: ["NÃO", "SIM"],
};

function distinctFromTable(table: RawTable, field: string): string[] {
  const values = new Set<string>();
  for (const row of table.rows) {
    const raw = row[field];
    if (raw == null || !String(raw).trim()) continue;
    values.add(String(raw).trim());
    if (values.size >= MAX_DISTINCT) break;
  }
  return Array.from(values).sort((a, b) => a.localeCompare(b, "pt-BR"));
}

function valuesFromReference(reference: KommoReferenceData, field: string): string[] | null {
  const key = REFERENCE_FIELD_MAP[field];
  if (!key) return null;
  const map = reference[key];
  return [...new Set(Object.values(map))].sort((a, b) => a.localeCompare(b, "pt-BR"));
}

export async function getFieldDistinctValues(params: {
  userId: string;
  source: WidgetDataSource;
  field: string;
  kommoConfig?: KommoClientConfig | null;
  globalRange?: DateRange;
  datasetOwnerId?: string | null;
  bustCache?: boolean;
}): Promise<string[]> {
  const { userId, source, field, kommoConfig, globalRange, datasetOwnerId, bustCache } = params;
  if (!field.trim()) return [];

  if (STATIC_FIELD_VALUES[field]) {
    return STATIC_FIELD_VALUES[field];
  }

  if (source.kind === "kommo") {
    if (!kommoConfig) return [];

    const reference = await fetchKommoReferenceData({ config: kommoConfig, bustCache });
    const fromReference = valuesFromReference(reference, field);
    if (fromReference) return fromReference;

    const table = await fetchKommoRawTable({ config: kommoConfig, bustCache });
    const scoped = globalRange
      ? filterRawTable(table, [], { mode: "inherit", field: "Data_Criacao" }, globalRange, "Data_Criacao")
      : table;
    return distinctFromTable(scoped, field);
  }

  if (source.kind === "dataset") {
    const ownerId = datasetOwnerId ?? userId;
    const ds = await getRawDataset(ownerId, source.datasetId);
    if (!ds) return [];
    const table = ds.rawTable as unknown as RawTable;
    return distinctFromTable(table, field);
  }

  return [];
}
