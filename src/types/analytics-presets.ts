import type { DashboardLayoutState } from "@/types/dashboard-layout";

/** Um layout salvo e nomeado da aba Analytics (totalmente do usuário). */
export type AnalyticsPreset = {
  id: string;
  name: string;
  description?: string;
  layout: DashboardLayoutState;
  /** Quando compartilhado, o id do Layout (entidade) espelhado para os visualizadores. */
  layoutId?: string;
  /** Visualizadores com acesso a este layout (quando compartilhado). */
  sharedViewerIds?: string[];
  createdAt?: string;
  updatedAt?: string;
  /** ID do criador do layout — usado por visualizadores para resolver datasets compartilhados. */
  dataOwnerId?: string;
  /** Somente leitura no cliente (ex.: visualizador recebendo layout compartilhado). */
  readOnly?: boolean;
};

export type AnalyticsPresetsCollection = {
  presets: AnalyticsPreset[];
  activePresetId: string;
};
