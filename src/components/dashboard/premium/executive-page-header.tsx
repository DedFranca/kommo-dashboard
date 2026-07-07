"use client";

import { useEffect, useRef, useState } from "react";
import { Bell, Filter, Menu, RefreshCw } from "lucide-react";
import { DateRangePicker } from "@/components/dashboard/date-range-picker";
import type { DateRange } from "@/lib/date-range";
import { cn } from "@/lib/utils";

type Props = {
  dateRange: DateRange;
  onDateRangeChange: (range: DateRange) => void;
  onOpenFilters?: () => void;
  onRefresh?: () => void;
  refreshing?: boolean;
  onMenuClick?: () => void;
  filtersOpen?: boolean;
  showPeriodPicker?: boolean;
  showFiltersButton?: boolean;
  title?: string;
  subtitle?: string;
};

export function ExecutivePageHeader({
  dateRange,
  onDateRangeChange,
  onOpenFilters,
  onRefresh,
  refreshing = false,
  onMenuClick,
  filtersOpen = false,
  showPeriodPicker = true,
  showFiltersButton = false,
  title = "Dashboard Executivo",
  subtitle = "Visão geral do desempenho",
}: Props) {
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const notificationsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (notificationsRef.current && !notificationsRef.current.contains(e.target as Node)) {
        setNotificationsOpen(false);
      }
    }
    if (notificationsOpen) document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, [notificationsOpen]);

  return (
    <div className="border-b border-slate-200/80 bg-white px-4 py-4 shadow-sm sm:px-6 lg:px-8">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-start gap-3">
          <button
            type="button"
            onClick={onMenuClick}
            className="mt-0.5 inline-flex h-10 w-10 items-center justify-center rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 md:hidden"
            aria-label="Abrir menu"
          >
            <Menu className="h-5 w-5" />
          </button>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">{title}</h1>
            <p className="mt-0.5 text-sm text-slate-500">{subtitle}</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          {showPeriodPicker ? <DateRangePicker value={dateRange} onChange={onDateRangeChange} /> : null}
          {showFiltersButton && onOpenFilters ? (
            <button
              type="button"
              onClick={onOpenFilters}
              className={cn(
                "inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium transition-colors",
                filtersOpen
                  ? "border-blue-600 bg-blue-50 text-blue-700"
                  : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50",
              )}
            >
              <Filter className="h-4 w-4" />
              Filtros
            </button>
          ) : null}

          <div className="relative" ref={notificationsRef}>
            <button
              type="button"
              onClick={() => setNotificationsOpen((o) => !o)}
              className={cn(
                "inline-flex h-10 w-10 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50",
                notificationsOpen && "border-slate-300 bg-slate-50",
              )}
              aria-label="Notificações"
              aria-expanded={notificationsOpen}
              aria-haspopup="true"
            >
              <Bell className="h-5 w-5" />
            </button>

            {notificationsOpen ? (
              <div
                role="dialog"
                aria-label="Painel de notificações"
                className="absolute right-0 z-50 mt-2 w-[min(100vw-2rem,320px)] rounded-xl border border-slate-200 bg-white shadow-lg"
              >
                <div className="border-b border-slate-100 px-4 py-3">
                  <h2 className="text-sm font-semibold text-slate-900">Notificações</h2>
                </div>
                <div className="max-h-72 overflow-y-auto px-4 py-6 text-center">
                  <p className="text-sm text-slate-500">Nenhuma notificação no momento.</p>
                  <p className="mt-1 text-xs text-slate-400">Novos alertas aparecerão aqui em breve.</p>
                </div>
              </div>
            ) : null}
          </div>

          {onRefresh ? (
            <button
              type="button"
              onClick={onRefresh}
              disabled={refreshing}
              className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-50"
              aria-label="Atualizar dados"
            >
              <RefreshCw className={cn("h-5 w-5", refreshing && "animate-spin")} />
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
