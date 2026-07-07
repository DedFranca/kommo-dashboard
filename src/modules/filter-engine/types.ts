/** Filtros globais aplicados a todos os widgets compatíveis. */
export type GlobalFilterState = {
  period: { from: Date; to: Date };
  responsibleId?: string;
  pipelineId?: string;
  origin?: string;
  status?: string;
};

export type GlobalFilterKey = keyof Omit<GlobalFilterState, "period">;

export type FilterControlDefinition = {
  key: GlobalFilterKey | "period";
  label: string;
  type: "dateRange" | "select" | "multiSelect";
  options?: { value: string; label: string }[];
};

export const GLOBAL_FILTER_CONTROLS: FilterControlDefinition[] = [
  { key: "period", label: "Período", type: "dateRange" },
  { key: "responsibleId", label: "Responsável", type: "select" },
  { key: "pipelineId", label: "Pipeline", type: "select" },
  { key: "origin", label: "Origem", type: "select" },
  { key: "status", label: "Status", type: "select" },
];
