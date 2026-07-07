"use client";

import { ExecutiveFiltersBar } from "@/components/dashboard/executive/executive-filters-bar";
import type { DashboardFilterOptions, DashboardFilters } from "@/types/dashboard-filters";
import { cn } from "@/lib/utils";

type Props = {
  open: boolean;
  filters: DashboardFilters;
  options: DashboardFilterOptions;
  onChange: (filters: DashboardFilters) => void;
};

export function FiltersPanel({ open, filters, options, onChange }: Props) {
  return (
    <div
      className={cn(
        "overflow-hidden transition-all duration-300",
        open ? "max-h-[480px] opacity-100" : "max-h-0 opacity-0",
      )}
    >
      <div className="px-4 pb-4 sm:px-6 lg:px-8">
        <ExecutiveFiltersBar filters={filters} options={options} onChange={onChange} />
      </div>
    </div>
  );
}
