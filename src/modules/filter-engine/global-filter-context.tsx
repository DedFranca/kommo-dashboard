"use client";

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import { DEFAULT_DATE_RANGE } from "@/lib/date-range";
import type { GlobalFilterState } from "./types";

type GlobalFilterContextValue = {
  filters: GlobalFilterState;
  setPeriod: (from: Date, to: Date) => void;
  setFilter: <K extends keyof Omit<GlobalFilterState, "period">>(
    key: K,
    value: GlobalFilterState[K],
  ) => void;
  clearFilter: <K extends keyof Omit<GlobalFilterState, "period">>(key: K) => void;
  resetFilters: () => void;
};

const GlobalFilterContext = createContext<GlobalFilterContextValue | null>(null);

function createDefaultFilters(): GlobalFilterState {
  return {
    period: { from: DEFAULT_DATE_RANGE.from, to: DEFAULT_DATE_RANGE.to },
  };
}

type Props = {
  children: ReactNode;
  initialPeriod?: { from: Date; to: Date };
};

export function GlobalFilterProvider({ children, initialPeriod }: Props) {
  const [filters, setFilters] = useState<GlobalFilterState>(() => ({
    ...createDefaultFilters(),
    period: initialPeriod ?? createDefaultFilters().period,
  }));

  const setPeriod = useCallback((from: Date, to: Date) => {
    setFilters((prev) => ({ ...prev, period: { from, to } }));
  }, []);

  const setFilter = useCallback(
    <K extends keyof Omit<GlobalFilterState, "period">>(key: K, value: GlobalFilterState[K]) => {
      setFilters((prev) => ({ ...prev, [key]: value }));
    },
    [],
  );

  const clearFilter = useCallback(<K extends keyof Omit<GlobalFilterState, "period">>(key: K) => {
    setFilters((prev) => {
      const next = { ...prev };
      delete next[key];
      return next;
    });
  }, []);

  const resetFilters = useCallback(() => {
    setFilters(createDefaultFilters());
  }, []);

  const value = useMemo(
    () => ({ filters, setPeriod, setFilter, clearFilter, resetFilters }),
    [filters, setPeriod, setFilter, clearFilter, resetFilters],
  );

  return <GlobalFilterContext.Provider value={value}>{children}</GlobalFilterContext.Provider>;
}

export function useGlobalFilters() {
  const ctx = useContext(GlobalFilterContext);
  if (!ctx) throw new Error("useGlobalFilters must be used within GlobalFilterProvider");
  return ctx;
}

export function useGlobalFiltersOptional() {
  return useContext(GlobalFilterContext);
}
