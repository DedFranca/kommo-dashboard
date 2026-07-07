"use client";

import { useCallback, useRef, useState } from "react";
import type { Layout, Layouts } from "react-grid-layout";
import { coerceAnalyticsLayout } from "@/types/analytics-layout";
import type { AnalyticsPreset, AnalyticsPresetsCollection } from "@/types/analytics-presets";
import type { DashboardLayoutState } from "@/types/dashboard-layout";

const JSON_HEADERS = { "Content-Type": "application/json" };

async function readApiError(res: Response, fallback: string): Promise<string> {
  try {
    const body = (await res.json()) as { error?: string };
    if (body.error?.trim()) return body.error;
  } catch {
    /* resposta não-JSON */
  }
  return `${fallback} (HTTP ${res.status})`;
}

/**
 * Gerencia os layouts salvos da aba Analytics (CRUD) + o canvas em edição.
 * O canvas reflete sempre o preset ativo; "salvar" persiste no preset ativo.
 */
export function useAnalyticsPresets(
  initial: AnalyticsPresetsCollection,
  options?: { readOnly?: boolean },
) {
  const readOnly = options?.readOnly ?? false;
  const [presets, setPresets] = useState<AnalyticsPreset[]>(initial.presets);
  const [activePresetId, setActivePresetId] = useState<string>(initial.activePresetId);
  const initialActive = initial.presets.find((p) => p.id === initial.activePresetId) ?? initial.presets[0];
  const [state, setState] = useState<DashboardLayoutState>(() => coerceAnalyticsLayout(initialActive?.layout));
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const activePresetIdRef = useRef(activePresetId);
  activePresetIdRef.current = activePresetId;

  const saveQueueRef = useRef<Promise<void>>(Promise.resolve());

  const loadCollection = useCallback((coll: AnalyticsPresetsCollection) => {
    setPresets(coll.presets);
    setActivePresetId(coll.activePresetId);
    activePresetIdRef.current = coll.activePresetId;
    const active = coll.presets.find((p) => p.id === coll.activePresetId) ?? coll.presets[0];
    setState(coerceAnalyticsLayout(active?.layout));
    setDirty(false);
  }, []);

  const onLayoutChange = useCallback((_layout: Layout[], allLayouts: Layouts) => {
    setState((prev) => ({ ...prev, layouts: allLayouts }));
    setDirty(true);
    setError(null);
  }, []);

  const persistLayout = useCallback(
    async (layout: DashboardLayoutState, presetId = activePresetIdRef.current) => {
      if (readOnly) return;
      if (!presetId) {
        throw new Error("Nenhum layout ativo selecionado.");
      }

      const run = async () => {
        const res = await fetch("/api/analytics/presets", {
          method: "PATCH",
          headers: JSON_HEADERS,
          body: JSON.stringify({ presetId, action: "update", layout }),
        });
        if (!res.ok) {
          throw new Error(await readApiError(res, "Não foi possível salvar o layout."));
        }
        const coll = (await res.json()) as AnalyticsPresetsCollection;
        setPresets(coll.presets);
        setActivePresetId(coll.activePresetId);
        activePresetIdRef.current = coll.activePresetId;
      };

      saveQueueRef.current = saveQueueRef.current.then(run, run);
      await saveQueueRef.current;
    },
    [readOnly],
  );

  /** Aplica mudanças no canvas; persistência via auto-save ou botão Salvar. */
  const applyAndPersist = useCallback((next: DashboardLayoutState) => {
    setState(next);
    setDirty(true);
    setError(null);
  }, []);

  /** Botão "Salvar layout" / auto-save. */
  const saveActive = useCallback(async () => {
    setSaving(true);
    setError(null);
    try {
      await persistLayout(state);
      setDirty(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro ao salvar");
      throw e;
    } finally {
      setSaving(false);
    }
  }, [persistLayout, state]);

  const selectPreset = useCallback(
    async (presetId: string) => {
      if (presetId === activePresetId) return;
      if (readOnly) {
        const target = presets.find((p) => p.id === presetId);
        if (target) {
          setState(coerceAnalyticsLayout(target.layout));
          setActivePresetId(presetId);
          activePresetIdRef.current = presetId;
          setDirty(false);
        }
        return;
      }
      if (dirty) {
        try {
          await persistLayout(state);
          setDirty(false);
        } catch {
          /* segue mesmo se falhar o save anterior */
        }
      }
      const res = await fetch("/api/analytics/presets", {
        method: "PATCH",
        headers: JSON_HEADERS,
        body: JSON.stringify({ presetId, action: "setActive" }),
      });
      if (res.ok) loadCollection((await res.json()) as AnalyticsPresetsCollection);
    },
    [activePresetId, dirty, state, persistLayout, loadCollection, readOnly, presets],
  );

  const shareActive = useCallback(
    async (viewerIds: string[]) => {
      const res = await fetch("/api/analytics/presets/share", {
        method: "POST",
        headers: JSON_HEADERS,
        body: JSON.stringify({ presetId: activePresetIdRef.current, viewerIds }),
      });
      if (!res.ok) {
        throw new Error(await readApiError(res, "Não foi possível compartilhar o layout."));
      }
      const coll = (await res.json()) as AnalyticsPresetsCollection;
      setPresets(coll.presets);
    },
    [],
  );

  const createPreset = useCallback(
    async (input: { name: string; description?: string; layout?: DashboardLayoutState }) => {
      const res = await fetch("/api/analytics/presets", {
        method: "POST",
        headers: JSON_HEADERS,
        body: JSON.stringify(input),
      });
      if (!res.ok) {
        throw new Error(await readApiError(res, "Não foi possível criar o layout."));
      }
      loadCollection((await res.json()) as AnalyticsPresetsCollection);
    },
    [loadCollection],
  );

  const deletePreset = useCallback(
    async (presetId: string) => {
      const res = await fetch(`/api/analytics/presets?id=${encodeURIComponent(presetId)}`, {
        method: "DELETE",
      });
      if (res.ok) loadCollection((await res.json()) as AnalyticsPresetsCollection);
    },
    [loadCollection],
  );

  const renamePreset = useCallback(async (presetId: string, name: string) => {
    const res = await fetch("/api/analytics/presets", {
      method: "PATCH",
      headers: JSON_HEADERS,
      body: JSON.stringify({ presetId, action: "update", name }),
    });
    if (res.ok) {
      const coll = (await res.json()) as AnalyticsPresetsCollection;
      setPresets(coll.presets);
    }
  }, []);

  return {
    presets,
    activePresetId,
    state,
    setState,
    setDirty,
    dirty,
    saving,
    error,
    onLayoutChange,
    applyAndPersist,
    saveActive,
    selectPreset,
    createPreset,
    deletePreset,
    renamePreset,
    shareActive,
  };
}
