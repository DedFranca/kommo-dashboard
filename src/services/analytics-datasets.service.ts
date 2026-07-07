import { prisma } from "@/lib/prisma";
import type { InferredSchema, RawTable, SemanticMap } from "@/types/analytics";

type StoredRawDataset = {
  id: string;
  name: string;
  fileName?: string;
  sourceType: string;
  rawTable: RawTable;
  inferredSchema: InferredSchema;
  semanticMap: SemanticMap;
  createdAt: string;
};

/**
 * Datasets importados (CSV / Google Sheets) são armazenados em
 * `Dashboard.settings.rawDatasets`. Não usamos um modelo Prisma dedicado para
 * evitar depender de uma migration (`RawDataset`) que pode não estar aplicada.
 */
function getRawDatasetsFromSettings(settings: unknown): StoredRawDataset[] {
  const list = (settings as { rawDatasets?: unknown })?.rawDatasets;
  return Array.isArray(list) ? (list as StoredRawDataset[]) : [];
}

function newId(prefix: string) {
  const uuid =
    typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`;
  return `${prefix}_${uuid}`;
}

async function getDashboardWithSettings(userId: string) {
  const dashboard = await prisma.dashboard.findUnique({
    where: { userId },
    select: { id: true, settings: true },
  });
  if (!dashboard) throw new Error("Dashboard não encontrado");
  return dashboard;
}

async function writeRawDatasets(dashboardId: string, settings: unknown, next: StoredRawDataset[]) {
  await prisma.dashboard.update({
    where: { id: dashboardId },
    data: { settings: { ...((settings as object) ?? {}), rawDatasets: next } as unknown as object },
  });
}

export async function createRawDataset(input: {
  userId: string;
  name: string;
  fileName?: string;
  sourceType: string;
  rawTable: RawTable;
  inferredSchema: InferredSchema;
  semanticMap: SemanticMap;
}) {
  const dashboard = await getDashboardWithSettings(input.userId);

  const record: StoredRawDataset = {
    id: newId("rds"),
    name: input.name,
    fileName: input.fileName,
    sourceType: input.sourceType,
    rawTable: input.rawTable,
    inferredSchema: input.inferredSchema,
    semanticMap: input.semanticMap,
    createdAt: new Date().toISOString(),
  };

  const next = [...getRawDatasetsFromSettings(dashboard.settings), record];
  await writeRawDatasets(dashboard.id, dashboard.settings, next);

  return {
    id: record.id,
    dashboardId: dashboard.id,
    name: record.name,
    fileName: record.fileName,
    sourceType: record.sourceType,
    rawTable: record.rawTable as unknown as object,
    inferredSchema: record.inferredSchema as unknown as object,
    semanticMap: record.semanticMap as unknown as object,
  };
}

export async function getRawDataset(userId: string, datasetId: string) {
  const dashboard = await getDashboardWithSettings(userId);
  const found = getRawDatasetsFromSettings(dashboard.settings).find((d) => d.id === datasetId);
  if (!found) return null;
  return {
    id: found.id,
    dashboardId: dashboard.id,
    name: found.name,
    fileName: found.fileName,
    sourceType: found.sourceType,
    rawTable: found.rawTable as unknown as object,
    inferredSchema: found.inferredSchema as unknown as object,
    semanticMap: found.semanticMap as unknown as object,
  };
}

export async function deleteRawDataset(userId: string, datasetId: string): Promise<boolean> {
  const dashboard = await getDashboardWithSettings(userId);
  const list = getRawDatasetsFromSettings(dashboard.settings);
  const next = list.filter((d) => d.id !== datasetId);
  if (next.length === list.length) return false;

  await writeRawDatasets(dashboard.id, dashboard.settings, next);
  return true;
}

export async function listRawDatasets(userId: string) {
  const dashboard = await getDashboardWithSettings(userId);
  return getRawDatasetsFromSettings(dashboard.settings)
    .slice()
    .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))
    .map((d) => ({
      id: d.id,
      name: d.name,
      fileName: d.fileName,
      sourceType: d.sourceType,
      createdAt: d.createdAt,
    }));
}
