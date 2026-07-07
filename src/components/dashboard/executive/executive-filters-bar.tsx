"use client";

import type { DashboardFilterOptions } from "@/types/dashboard-filters";
import type { DashboardFilters } from "@/types/dashboard-filters";

type Props = {
  filters: DashboardFilters;
  options: DashboardFilterOptions;
  onChange: (filters: DashboardFilters) => void;
};

function MultiSelect({
  label,
  options,
  selected,
  onToggle,
}: {
  label: string;
  options: { id: number; name: string }[];
  selected: number[];
  onToggle: (id: number) => void;
}) {
  return (
    <div className="min-w-[160px] flex-1">
      <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-slate-500">{label}</label>
      <div className="max-h-28 overflow-y-auto rounded-lg border border-slate-200 bg-white p-2 dark:border-slate-700 dark:bg-slate-900">
        {options.length === 0 ? (
          <p className="text-xs text-slate-400">Sem opções</p>
        ) : (
          options.map((opt) => (
            <label key={opt.id} className="flex cursor-pointer items-center gap-2 py-0.5 text-xs text-slate-700 dark:text-slate-200">
              <input
                type="checkbox"
                checked={selected.includes(opt.id)}
                onChange={() => onToggle(opt.id)}
                className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
              />
              <span className="truncate">{opt.name}</span>
            </label>
          ))
        )}
      </div>
    </div>
  );
}

export function ExecutiveFiltersBar({ filters, options, onChange }: Props) {
  const toggle = (key: keyof DashboardFilters, id: number) => {
    const current = filters[key];
    const next = current.includes(id) ? current.filter((x) => x !== id) : [...current, id];
    onChange({ ...filters, [key]: next });
  };

  const clearAll = () => {
    onChange({ pipelineIds: [], responsibleIds: [], statusIds: [] });
  };

  const hasFilters =
    filters.pipelineIds.length > 0 || filters.responsibleIds.length > 0 || filters.statusIds.length > 0;

  return (
    <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-[0_4px_20px_rgba(15,23,42,0.04)]">
      <div className="mb-3 flex items-center justify-between gap-2">
        <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-100">Filtros globais</h3>
        {hasFilters ? (
          <button
            type="button"
            onClick={clearAll}
            className="text-xs font-medium text-indigo-600 hover:text-indigo-700 dark:text-indigo-400"
          >
            Limpar filtros
          </button>
        ) : null}
      </div>
      <div className="flex flex-col gap-3 lg:flex-row">
        <MultiSelect
          label="Pipeline"
          options={options.pipelines}
          selected={filters.pipelineIds}
          onToggle={(id) => toggle("pipelineIds", id)}
        />
        <MultiSelect
          label="Responsável"
          options={options.responsibles}
          selected={filters.responsibleIds}
          onToggle={(id) => toggle("responsibleIds", id)}
        />
        <MultiSelect
          label="Status"
          options={options.statuses}
          selected={filters.statusIds}
          onToggle={(id) => toggle("statusIds", id)}
        />
      </div>
    </div>
  );
}
