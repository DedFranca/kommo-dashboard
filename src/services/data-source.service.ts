import { prisma } from "@/lib/prisma";
import { DEFAULT_DASHBOARD_LAYOUT } from "@/types/dashboard-layout";
import type { CustomDataSource, DashboardSettings, DashboardDataset } from "@/types/data-source";

export function parseDataSources(raw: unknown): CustomDataSource[] {
  if (!Array.isArray(raw)) return [];
  return raw as CustomDataSource[];
}

export function parseDatasets(raw: unknown): DashboardDataset[] {
  if (!Array.isArray(raw)) return [];
  return raw as DashboardDataset[];
}

export function parseSettings(raw: unknown): DashboardSettings {
  if (!raw || typeof raw !== "object") return {};
  return raw as DashboardSettings;
}

export async function getDashboardSettings(userId: string): Promise<DashboardSettings> {
  const dashboard = await prisma.dashboard.findUnique({
    where: { userId },
    select: { settings: true },
  });
  return parseSettings(dashboard?.settings);
}

export async function getDashboardExtras(userId: string) {
  const dashboard = await prisma.dashboard.findUnique({
    where: { userId },
    select: { dataSources: true, settings: true },
  });
  const dataSources = parseDataSources(dashboard?.dataSources);
  const settings = parseSettings(dashboard?.settings);
  const datasets = parseDatasets(settings.datasets);
  return { dataSources, settings, datasets };
}

export async function saveDataSources(userId: string, sources: CustomDataSource[]) {
  await prisma.dashboard.update({
    where: { userId },
    data: { dataSources: sources as unknown as object },
  });
  return sources;
}

export async function saveDashboardSettings(userId: string, settings: DashboardSettings) {
  const existing = await prisma.dashboard.findUnique({
    where: { userId },
    select: { settings: true },
  });

  const prior = parseSettings(existing?.settings);
  const nextSettings = { ...prior, ...settings };

  if (!existing) {
    await prisma.dashboard.create({
      data: {
        userId,
        name: "Meu dashboard",
        layout: DEFAULT_DASHBOARD_LAYOUT as object,
        dataSources: [],
        settings: nextSettings as object,
        layoutPresets: [],
      },
    });
    return nextSettings;
  }

  await prisma.dashboard.update({
    where: { userId },
    data: { settings: nextSettings as object },
  });
  return nextSettings;
}

export async function addDataSource(userId: string, source: CustomDataSource) {
  const { dataSources } = await getDashboardExtras(userId);
  const next = [...dataSources, source];
  await saveDataSources(userId, next);
  return next;
}

export async function removeDataSource(userId: string, sourceId: string) {
  const { dataSources } = await getDashboardExtras(userId);
  const next = dataSources.filter((s) => s.id !== sourceId);
  await saveDataSources(userId, next);
  return next;
}

export async function getDashboardDatasets(userId: string) {
  const { datasets } = await getDashboardExtras(userId);
  return datasets;
}

export async function getDashboardDataset(userId: string, datasetId: string) {
  const datasets = await getDashboardDatasets(userId);
  return datasets.find((dataset) => dataset.id === datasetId) ?? null;
}

export async function addDashboardDataset(userId: string, dataset: DashboardDataset) {
  const { settings } = await getDashboardExtras(userId);
  const nextDatasets = [...(settings.datasets ?? []), dataset];
  await saveDashboardSettings(userId, { ...settings, datasets: nextDatasets });
  return dataset;
}
