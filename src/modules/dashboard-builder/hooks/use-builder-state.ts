"use client";

import { useCallback, useState } from "react";
import { DEFAULT_BUILDER_STATE, type BuilderMode, type BuilderState } from "../types";

export function useBuilderState(initialMode: BuilderMode = "view") {
  const [state, setState] = useState<BuilderState>({
    ...DEFAULT_BUILDER_STATE,
    mode: initialMode,
  });

  const setMode = useCallback((mode: BuilderMode) => {
    setState((prev) => ({
      ...prev,
      mode,
      selectedWidgetId: mode === "view" ? null : prev.selectedWidgetId,
    }));
  }, []);

  const selectWidget = useCallback((widgetId: string | null) => {
    setState((prev) => ({ ...prev, selectedWidgetId: widgetId }));
  }, []);

  const toggleLeftPanel = useCallback(() => {
    setState((prev) => ({ ...prev, leftPanelOpen: !prev.leftPanelOpen }));
  }, []);

  const toggleRightPanel = useCallback(() => {
    setState((prev) => ({ ...prev, rightPanelOpen: !prev.rightPanelOpen }));
  }, []);

  const toggleSnapToGrid = useCallback(() => {
    setState((prev) => ({ ...prev, snapToGrid: !prev.snapToGrid }));
  }, []);

  return {
    ...state,
    setMode,
    selectWidget,
    toggleLeftPanel,
    toggleRightPanel,
    toggleSnapToGrid,
    isEditing: state.mode === "edit",
  };
}
