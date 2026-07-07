"use client";

import { useCallback, useEffect, useState } from "react";
import type { Layout, Layouts } from "react-grid-layout";
import {
  normalizeDashboardLayout,
  type DashboardLayoutState,
} from "@/types/dashboard-layout";

export function useDashboardLayout(initial: DashboardLayoutState) {
  const [state, setState] = useState<DashboardLayoutState>(() => normalizeDashboardLayout(initial));
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setState(normalizeDashboardLayout(initial));
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
      const res = await fetch("/api/dashboard/layout", {
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
    } finally {
      setSaving(false);
    }
  }, [state]);

  return { state, setState, setDirty, onLayoutChange, saveLayout, saving, dirty, error };
}
