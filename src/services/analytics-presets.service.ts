import { getDashboardSettings, saveDashboardSettings } from "@/services/data-source.service";
import { getOrCreateDashboardForUser } from "@/services/dashboard.service";
import { createLayout, deleteLayout, setLayoutShares, updateLayout } from "@/services/layout.service";
import { coerceAnalyticsLayout, EMPTY_ANALYTICS_LAYOUT } from "@/types/analytics-layout";
import type { AnalyticsPreset, AnalyticsPresetsCollection } from "@/types/analytics-presets";
import type { DashboardLayoutState } from "@/types/dashboard-layout";

function newPresetId(): string {
  const uuid =
    typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`;
  return `alp_${uuid}`;
}

function makePreset(input: { name: string; description?: string; layout?: DashboardLayoutState }): AnalyticsPreset {
  const now = new Date().toISOString();
  return {
    id: newPresetId(),
    name: input.name.trim() || "Novo layout",
    description: input.description?.trim() || undefined,
    layout: coerceAnalyticsLayout(input.layout ?? EMPTY_ANALYTICS_LAYOUT),
    createdAt: now,
    updatedAt: now,
  };
}

/** Carrega a coleção, semeando um layout inicial na primeira vez. */
export async function getAnalyticsPresets(userId: string): Promise<AnalyticsPresetsCollection> {
  await getOrCreateDashboardForUser(userId);
  const settings = await getDashboardSettings(userId);

  const stored = settings.analyticsPresets;
  if (Array.isArray(stored) && stored.length > 0) {
    let activePresetId = settings.analyticsActivePresetId;
    if (!activePresetId || !stored.some((p) => p.id === activePresetId)) {
      activePresetId = stored[0]!.id;
    }
    return { presets: stored, activePresetId };
  }

  // Primeira vez: migra o layout de trabalho existente, se houver, senão começa em branco.
  const seedLayout =
    settings.analyticsLayout && settings.analyticsLayout.widgets?.length
      ? settings.analyticsLayout
      : EMPTY_ANALYTICS_LAYOUT;

  const preset = makePreset({ name: "Meu layout", layout: seedLayout });
  await saveDashboardSettings(userId, {
    analyticsPresets: [preset],
    analyticsActivePresetId: preset.id,
  });
  return { presets: [preset], activePresetId: preset.id };
}

export async function createAnalyticsPreset(
  userId: string,
  input: { name: string; description?: string; layout?: DashboardLayoutState },
): Promise<AnalyticsPresetsCollection> {
  const { presets } = await getAnalyticsPresets(userId);
  const preset = makePreset(input);
  const next = [...presets, preset];
  await saveDashboardSettings(userId, { analyticsPresets: next, analyticsActivePresetId: preset.id });
  return { presets: next, activePresetId: preset.id };
}

export async function updateAnalyticsPreset(
  userId: string,
  presetId: string,
  patch: { name?: string; description?: string; layout?: DashboardLayoutState },
): Promise<AnalyticsPresetsCollection> {
  const { presets, activePresetId } = await getAnalyticsPresets(userId);
  const idx = presets.findIndex((p) => p.id === presetId);
  if (idx < 0) throw new Error("Layout não encontrado");

  const current = presets[idx]!;
  const updated: AnalyticsPreset = {
    ...current,
    name: patch.name?.trim() ? patch.name.trim() : current.name,
    description:
      patch.description !== undefined ? patch.description.trim() || undefined : current.description,
    layout: patch.layout ? coerceAnalyticsLayout(patch.layout) : current.layout,
    updatedAt: new Date().toISOString(),
  };

  const next = presets.map((p, i) => (i === idx ? updated : p));
  await saveDashboardSettings(userId, { analyticsPresets: next });

  // Mantém o layout compartilhado em sincronia com o preset do criador.
  if (updated.layoutId) {
    try {
      await updateLayout(updated.layoutId, { name: updated.name, config: updated.layout }, userId);
    } catch {
      /* não bloqueia o save local se o layout compartilhado falhar */
    }
  }

  return { presets: next, activePresetId };
}

/** Compartilha (ou atualiza o compartilhamento de) um preset com visualizadores. */
export async function shareAnalyticsPreset(
  userId: string,
  presetId: string,
  viewerIds: string[],
): Promise<AnalyticsPresetsCollection> {
  const { presets, activePresetId } = await getAnalyticsPresets(userId);
  const idx = presets.findIndex((p) => p.id === presetId);
  if (idx < 0) throw new Error("Layout não encontrado");

  const preset = presets[idx]!;
  let layoutId = preset.layoutId;

  if (layoutId) {
    const updated = await updateLayout(layoutId, { name: preset.name, config: preset.layout }, userId);
    if (!updated) layoutId = undefined;
  }
  if (!layoutId) {
    const created = await createLayout({
      ownerId: userId,
      name: preset.name,
      description: preset.description ?? null,
      kind: "ANALYTICS",
      config: preset.layout,
      dataSourceIntegrationId: null,
    });
    layoutId = created.id;
  }

  const summary = await setLayoutShares(layoutId, viewerIds, userId);
  const finalViewerIds = summary?.sharedViewerIds ?? viewerIds;

  const updatedPreset: AnalyticsPreset = { ...preset, layoutId, sharedViewerIds: finalViewerIds };
  const next = presets.map((p, i) => (i === idx ? updatedPreset : p));
  await saveDashboardSettings(userId, { analyticsPresets: next });
  return { presets: next, activePresetId };
}

export async function deleteAnalyticsPreset(
  userId: string,
  presetId: string,
): Promise<AnalyticsPresetsCollection> {
  const { presets, activePresetId } = await getAnalyticsPresets(userId);
  const removed = presets.find((p) => p.id === presetId);
  const next = presets.filter((p) => p.id !== presetId);

  if (removed?.layoutId) {
    try {
      await deleteLayout(removed.layoutId, userId);
    } catch {
      /* ignora se o layout compartilhado já não existir */
    }
  }

  if (next.length === 0) {
    const preset = makePreset({ name: "Meu layout", layout: EMPTY_ANALYTICS_LAYOUT });
    await saveDashboardSettings(userId, { analyticsPresets: [preset], analyticsActivePresetId: preset.id });
    return { presets: [preset], activePresetId: preset.id };
  }

  const nextActive = activePresetId === presetId ? next[0]!.id : activePresetId;
  await saveDashboardSettings(userId, { analyticsPresets: next, analyticsActivePresetId: nextActive });
  return { presets: next, activePresetId: nextActive };
}

export async function setActiveAnalyticsPreset(
  userId: string,
  presetId: string,
): Promise<AnalyticsPresetsCollection> {
  const { presets } = await getAnalyticsPresets(userId);
  if (!presets.some((p) => p.id === presetId)) throw new Error("Layout não encontrado");
  await saveDashboardSettings(userId, { analyticsActivePresetId: presetId });
  return { presets, activePresetId: presetId };
}
