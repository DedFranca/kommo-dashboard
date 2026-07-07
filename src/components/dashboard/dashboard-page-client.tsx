"use client";

import { useCallback, useMemo, useState } from "react";
import { ExecutiveDashboard } from "@/components/dashboard/executive/executive-dashboard";
import { ExecutivePageHeader } from "@/components/dashboard/premium/executive-page-header";
import { Sidebar } from "@/components/layout/sidebar";
import { Button } from "@/components/ui/button";
import { useDashboardMetrics } from "@/hooks/use-dashboard-metrics";
import { getDefaultDateRange, parseISODate } from "@/lib/date-range";
import type { DashboardInitialData } from "@/types/metrics-response";

type Props = {
  initial: DashboardInitialData;
};

export function DashboardPageClient({ initial }: Props) {
  const initialRange = useMemo(() => {
    const fallback = getDefaultDateRange();
    return {
      from: parseISODate(initial.period.from) ?? fallback.from,
      to: parseISODate(initial.period.to) ?? fallback.to,
    };
  }, [initial.period.from, initial.period.to]);

  const {
    metrics,
    range,
    setRange,
    loading,
    error: metricsError,
    kommoConfigured,
    refetch,
    refreshKommo,
  } = useDashboardMetrics(initialRange, { initial });

  const [refreshingKommo, setRefreshingKommo] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleRefreshKommo = useCallback(async () => {
    setRefreshingKommo(true);
    try {
      await refreshKommo();
    } finally {
      setRefreshingKommo(false);
    }
  }, [refreshKommo]);

  if (!metrics) {
    if (loading) {
      return (
        <div className="min-h-full bg-[#eef2f7]">
          <ExecutivePageHeader
            dateRange={range}
            onDateRangeChange={setRange}
            onRefresh={kommoConfigured ? handleRefreshKommo : undefined}
            refreshing={refreshingKommo}
            onMenuClick={() => setMobileMenuOpen(true)}
          />
          <div className="space-y-4 p-6">
            <p className="text-center text-sm text-slate-500">Carregando métricas do Kommo…</p>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-36 animate-pulse rounded-2xl bg-white/80" />
              ))}
            </div>
            <div className="h-96 animate-pulse rounded-2xl bg-white/80" />
          </div>
        </div>
      );
    }

    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center bg-[#eef2f7] px-4 py-12 text-center text-sm text-slate-500">
        {metricsError ? (
          <div className="mx-auto mb-4 max-w-lg rounded-2xl border border-red-200 bg-white px-4 py-3 text-red-800 shadow-sm">
            {metricsError}
          </div>
        ) : (
          <div className="mb-3">Nenhuma métrica disponível.</div>
        )}
        {!kommoConfigured ? (
          <p className="mb-4 text-xs text-slate-400">
            Configure as variáveis KOMMO_SUBDOMAIN e KOMMO_ACCESS_TOKEN no servidor.
          </p>
        ) : null}
        <Button onClick={() => refetch()} type="button">
          Tentar novamente
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-full bg-[#eef2f7]">
      {mobileMenuOpen ? (
        <>
          <button
            type="button"
            className="fixed inset-0 z-40 bg-slate-900/50 md:hidden"
            aria-label="Fechar menu"
            onClick={() => setMobileMenuOpen(false)}
          />
          <Sidebar className="fixed inset-y-0 left-0 z-50 md:hidden" onCloseMobile={() => setMobileMenuOpen(false)} />
        </>
      ) : null}

      <ExecutivePageHeader
        dateRange={range}
        onDateRangeChange={setRange}
        onRefresh={kommoConfigured ? handleRefreshKommo : undefined}
        refreshing={refreshingKommo}
        onMenuClick={() => setMobileMenuOpen(true)}
      />

      {metricsError ? (
        <div className="mx-4 mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-2 text-sm text-amber-900 sm:mx-6 lg:mx-8">
          {metricsError}
        </div>
      ) : null}

      {loading ? (
        <p className="px-6 py-2 text-center text-xs text-slate-500">Atualizando métricas…</p>
      ) : null}

      <ExecutiveDashboard metrics={metrics} />
    </div>
  );
}
