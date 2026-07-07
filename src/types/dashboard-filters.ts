export type FilterOption = {
  id: number;
  name: string;
};

export type DashboardFilterOptions = {
  pipelines: FilterOption[];
  responsibles: FilterOption[];
  statuses: FilterOption[];
};

export type DashboardFilters = {
  pipelineIds: number[];
  responsibleIds: number[];
  statusIds: number[];
};

export const EMPTY_DASHBOARD_FILTERS: DashboardFilters = {
  pipelineIds: [],
  responsibleIds: [],
  statusIds: [],
};
