"use client";

import { useCallback, useEffect, useState } from "react";
import type { Layout, Layouts } from "react-grid-layout";
import { normalizeAnalyticsLayout } from "@/types/analytics-layout";
import type { DashboardLayoutState } from "@/types/dashboard-layout";

export function useAnalyticsLayout(initial: DashboardLayoutState) {
  const [state, setState] = useState<DashboardLayoutState>(() => normalizeAnalyticsLayout(initial));
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setState(normalizeAnalyticsLayout(initial));
    setDirty(false);
  }, [initial]);

  const onLayoutChange = useCallback((_layout: Layout[], allLayouts: Layouts) => {
    setState((prev) => ({ ...prev, layouts: allLayouts }));
    setDirty(true);
    setError(null);
  }, []);

  const saveLayout = useCallback(async () => {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/analytics/layout", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ layout: state }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error((body as { error?: string }).error ?? "Não foi possível salvar o layout.");
      }
      setDirty(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro ao salvar");
      throw e;
    } finally {
      setSaving(false);
    }
  }, [state]);

  return { state, setState, setDirty, onLayoutChange, saveLayout, saving, dirty, error };
}
