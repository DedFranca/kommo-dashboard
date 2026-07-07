import { prisma } from "@/lib/prisma";
import { normalizeDashboardLayout, type DashboardLayoutState } from "@/types/dashboard-layout";
import {
  DEFAULT_PRESETS,
  DETAILED_LAYOUT,
  type LayoutPreset,
  type LayoutPresetsCollection,
} from "@/types/dashboard-presets";

function parseLayoutPresets(raw: unknown): LayoutPresetsCollection | null {
  if (!raw) return null;
  try {
    const parsed = typeof raw === "string" ? JSON.parse(raw) : raw;
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return null;
    const collection = parsed as LayoutPresetsCollection;
    if (!Array.isArray(collection.presets) || collection.presets.length === 0) return null;
    return collection;
  } catch {
    return null;
  }
}

/** Garante presets persistidos no banco (não só templates em memória). */
export async function ensureLayoutPresetsForUser(
  userId: string,
  currentLayout?: DashboardLayoutState,
): Promise<LayoutPresetsCollection> {
  const dashboard = await prisma.dashboard.findUnique({
    where: { userId },
    select: { layoutPresets: true, layout: true },
  });

  const existing = parseLayoutPresets(dashboard?.layoutPresets);
  if (existing) return existing;

  const layout = normalizeDashboardLayout(currentLayout ?? dashboard?.layout);
  const activePresetId = DETAILED_LAYOUT.id;
  const presets = DEFAULT_PRESETS.map((preset) =>
    preset.id === activePresetId
      ? { ...preset, layout: structuredClone(layout), updatedAt: new Date() }
      : { ...preset },
  );

  const collection: LayoutPresetsCollection = {
    presets,
    activePresetId,
    lastUpdated: new Date(),
  };

  await prisma.dashboard.update({
    where: { userId },
    data: { layoutPresets: JSON.stringify(collection) },
  });

  return collection;
}

export async function getLayoutPresetsForUser(
  userId: string,
  currentLayout?: DashboardLayoutState,
): Promise<LayoutPresetsCollection> {
  return ensureLayoutPresetsForUser(userId, currentLayout);
}

export async function updatePresetLayout(
  userId: string,
  presetId: string,
  layout: DashboardLayoutState,
): Promise<LayoutPresetsCollection> {
  const collection = await ensureLayoutPresetsForUser(userId, layout);
  const index = collection.presets.findIndex((preset) => preset.id === presetId);

  if (index < 0) {
    throw new Error("Layout não encontrado");
  }

  collection.presets[index] = {
    ...collection.presets[index],
    layout: normalizeDashboardLayout(layout),
    updatedAt: new Date(),
  };
  collection.lastUpdated = new Date();

  await prisma.dashboard.update({
    where: { userId },
    data: { layoutPresets: JSON.stringify(collection) },
  });

  return collection;
}

export async function saveLayoutPreset(
  userId: string,
  preset: LayoutPreset,
): Promise<LayoutPreset> {
  let collection = await ensureLayoutPresetsForUser(userId, preset.layout);

  // Update or add preset
  const existingIndex = collection.presets.findIndex((p) => p.id === preset.id);
  if (existingIndex >= 0) {
    collection.presets[existingIndex] = {
      ...preset,
      updatedAt: new Date(),
    };
  } else {
    collection.presets.push({
      ...preset,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  }

  await prisma.dashboard.update({
    where: { userId },
    data: { layoutPresets: JSON.stringify(collection) },
  });

  return {
    ...preset,
    updatedAt: new Date(),
  };
}

export async function deleteLayoutPreset(userId: string, presetId: string): Promise<void> {
  const dashboard = await prisma.dashboard.findUnique({
    where: { userId },
    select: { layoutPresets: true },
  });

  if (!dashboard?.layoutPresets) return;

  try {
    const collection = JSON.parse(String(dashboard.layoutPresets)) as LayoutPresetsCollection;

    // Prevent deletion of system presets
    if (presetId.startsWith("preset-")) {
      throw new Error("Cannot delete system presets");
    }

    collection.presets = collection.presets.filter((p) => p.id !== presetId);

    if (collection.activePresetId === presetId) {
      collection.activePresetId = collection.presets[0]?.id;
    }

    await prisma.dashboard.update({
      where: { userId },
      data: { layoutPresets: JSON.stringify(collection) },
    });
  } catch (error) {
    if (error instanceof Error && error.message === "Cannot delete system presets") {
      throw error;
    }
    // Ignore parsing errors
  }
}

export async function setActiveLayoutPreset(
  userId: string,
  presetId: string,
): Promise<LayoutPresetsCollection> {
  const collection = await ensureLayoutPresetsForUser(userId);
  if (!collection.presets.some((preset) => preset.id === presetId)) {
    throw new Error("Layout não encontrado");
  }
  collection.activePresetId = presetId;
  collection.lastUpdated = new Date();

  await prisma.dashboard.update({
    where: { userId },
    data: { layoutPresets: JSON.stringify(collection) },
  });

  return collection;
}
