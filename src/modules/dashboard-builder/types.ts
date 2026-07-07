/** Modo de interação do dashboard. */
export type BuilderMode = "view" | "edit";

export type BuilderState = {
  mode: BuilderMode;
  selectedWidgetId: string | null;
  leftPanelOpen: boolean;
  rightPanelOpen: boolean;
  snapToGrid: boolean;
};

export const DEFAULT_BUILDER_STATE: BuilderState = {
  mode: "view",
  selectedWidgetId: null,
  leftPanelOpen: true,
  rightPanelOpen: true,
  snapToGrid: true,
};
