import { getKommoDimensions, getKommoMetrics, KOMMO_FIELD_DEFINITIONS } from "@/lib/kommo/fields";
import { getRawDataset, listRawDatasets } from "@/services/analytics-datasets.service";
import { getDatasetFields } from "@/services/query-engine.service";
import type { RawTable } from "@/types/analytics";
import {
  DATA_SOURCE_TYPE_LABELS,
  datasetSourceTypeToUnified,
  type DataSourcePreview,
  type UnifiedDataSource,
} from "@/types/data-source-registry";

type DatasetListItem = {
  id: string;
  name: string;
  fileName?: string | null;
  sourceType?: string | null;
  createdAt?: string | Date;
};

function toIso(value: string | Date | undefined): string | undefined {
  if (!value) return undefined;
  return value instanceof Date ? value.toISOString() : value;
}

/** Lista todas as fontes de dados disponíveis (Kommo + datasets importados). */
export async function listUnifiedDataSources(
  userId: string,
  options?: { kommoConfigured?: boolean; sharedOwnerIds?: string[] },
): Promise<UnifiedDataSource[]> {
  const kommoConfigured = options?.kommoConfigured ?? false;
  const datasets = (await listRawDatasets(userId)) as DatasetListItem[];
  const seenDatasetIds = new Set<string>();

  const sources: UnifiedDataSource[] = [];

  if (kommoConfigured) {
    sources.push({
      id: "kommo",
      type: "kommo",
      label: "Kommo CRM — Leads",
      description: "Leads, negócios, origens e tempo de fechamento sincronizados do Kommo",
      fields: KOMMO_FIELD_DEFINITIONS,
      refreshable: true,
      status: "active",
    });
  }

  function appendDataset(ds: DatasetListItem, shared = false) {
    if (seenDatasetIds.has(ds.id)) return;
    seenDatasetIds.add(ds.id);
    const type = datasetSourceTypeToUnified(ds.sourceType);
    sources.push({
      id: ds.id,
      type,
      label: shared ? `${ds.name} (compartilhado)` : ds.name,
      description: ds.fileName ?? DATA_SOURCE_TYPE_LABELS[type],
      fields: [], // preenchido sob demanda via getDataSourceFields
      refreshable: type === "google_sheets",
      status: "active",
      createdAt: toIso(ds.createdAt),
    });
  }

  for (const ds of datasets) {
    appendDataset(ds);
  }

  for (const ownerId of options?.sharedOwnerIds ?? []) {
    if (ownerId === userId) continue;
    const ownerDatasets = (await listRawDatasets(ownerId)) as DatasetListItem[];
    for (const ds of ownerDatasets) {
      appendDataset(ds, true);
    }
  }

  // Preenche fields para cada dataset listado
  for (let i = 0; i < sources.length; i++) {
    const s = sources[i]!;
    if (s.type === "kommo") continue;
    const fields = (await getDatasetFields(userId, s.id)) ?? [];
    if (!fields.length) {
      // Tenta pelo owner se o visualizador não tem o dataset localmente
      for (const ownerId of options?.sharedOwnerIds ?? []) {
        const ownerFields = (await getDatasetFields(ownerId, s.id)) ?? [];
        if (ownerFields.length) {
          sources[i] = { ...s, fields: ownerFields };
          break;
        }
      }
    } else {
      sources[i] = { ...s, fields };
    }
  }

  return sources;
}

/** Campos (dimensões + métricas) de uma fonte, sem precisar buscar dados. */
export async function getDataSourceFields(userId: string, sourceId: string) {
  if (sourceId === "kommo") {
    return {
      fields: KOMMO_FIELD_DEFINITIONS,
      dimensions: getKommoDimensions(),
      metrics: getKommoMetrics(),
    };
  }
  const fields = (await getDatasetFields(userId, sourceId)) ?? null;
  if (!fields) return null;
  return {
    fields,
    dimensions: fields.filter((f) => f.role === "dimension" || f.role === "time"),
    metrics: fields.filter((f) => f.role === "metric"),
  };
}

/** Pré-visualização (primeiras linhas) de um dataset importado. */
export async function getDatasetPreview(
  userId: string,
  datasetId: string,
  limit = 10,
): Promise<DataSourcePreview | null> {
  const ds = await getRawDataset(userId, datasetId);
  if (!ds) return null;
  const table = ds.rawTable as unknown as RawTable;
  return {
    columns: table.columns ?? [],
    rows: (table.rows ?? []).slice(0, limit),
    rowCount: table.rows?.length ?? 0,
  };
}
