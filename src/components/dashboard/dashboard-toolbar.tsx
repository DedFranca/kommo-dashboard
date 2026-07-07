"use client";

import { DateRangePicker } from "@/components/dashboard/date-range-picker";
import type { DateRange } from "@/lib/date-range";
import { Button } from "@/components/ui/button";

type Props = {
  title?: string;
  periodLabel?: string;
  dateRange?: DateRange;
  onDateRangeChange?: (range: DateRange) => void;
  kommoConfigured?: boolean;
  kommoConnected?: boolean;
  kommoError?: string | null;
  onRefreshKommo?: () => void;
  refreshingKommo?: boolean;
  onAddWidget?: () => void;
  onImportDataset?: () => void;
  onEnterEditMode?: () => void;
  isEditing?: boolean;
  onResetLayout?: () => void;
};

export function DashboardToolbar({
  title = "Dashboard",
  periodLabel,
  dateRange,
  onDateRangeChange,
  kommoConfigured = false,
  kommoConnected,
  kommoError,
  onRefreshKommo,
  refreshingKommo = false,
  onAddWidget,
  onImportDataset,
  onEnterEditMode,
  isEditing = false,
  onResetLayout,
}: Props) {
  const kommoStatus = kommoError
    ? { label: "Kommo com erro", className: "bg-amber-100 text-amber-900" }
    : kommoConfigured && kommoConnected !== false
      ? { label: "Kommo conectado", className: "bg-emerald-100 text-emerald-800" }
      : null;

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-border bg-white px-4 py-3 shadow-sm sm:flex-row sm:items-center sm:justify-between">
      <div>
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="text-lg font-semibold tracking-tight text-slate-900">{title}</h2>
          {kommoStatus ? (
            <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${kommoStatus.className}`}>
              {kommoStatus.label}
            </span>
          ) : null}
        </div>
        {periodLabel ? (
          <p className="mt-0.5 text-xs text-slate-500">{periodLabel}</p>
        ) : null}
        {kommoError ? <p className="mt-1 text-xs text-amber-700">{kommoError}</p> : null}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        {onDateRangeChange && dateRange ? (
          <DateRangePicker value={dateRange} onChange={onDateRangeChange} />
        ) : null}
        {onRefreshKommo ? (
          <Button type="button" variant="outline" onClick={onRefreshKommo} disabled={refreshingKommo}>
            {refreshingKommo ? "Atualizando…" : "Atualizar Kommo"}
          </Button>
        ) : null}
        {onEnterEditMode && !isEditing ? (
          <Button type="button" variant="outline" onClick={onEnterEditMode}>
            Editar painéis
          </Button>
        ) : null}
        {onImportDataset ? (
          <Button type="button" variant="outline" onClick={onImportDataset}>
            Importar CSV
          </Button>
        ) : null}
        {onAddWidget ? (
          <Button type="button" onClick={onAddWidget}>
            Adicionar painel
          </Button>
        ) : null}
        {onResetLayout ? (
          <Button type="button" variant="outline" onClick={onResetLayout}>
            Restaurar layout padrão
          </Button>
        ) : null}
      </div>
    </div>
  );
}
