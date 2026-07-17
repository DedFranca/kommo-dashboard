"use client";

import { useCallback, useMemo, useState } from "react";
import { AnalyticsDatePicker } from "@/components/analytics/AnalyticsDatePicker";
import { AnalyticsSection, AnalyticsSkeleton } from "@/components/analytics/AnalyticsSection";
import { ClosingTimeKpi } from "@/components/analytics/ClosingTimeKpi";
import { CohortTable } from "@/components/analytics/CohortTable";
import { LeadOriginChart } from "@/components/analytics/LeadOriginChart";
import { ExecutivePageHeader } from "@/components/dashboard/premium/executive-page-header";
import { Sidebar } from "@/components/layout/sidebar";
import { Button } from "@/components/ui/button";
import { useAnalyticsMetrics } from "@/hooks/use-analytics-metrics";
import { getLastSixMonthsRange } from "@/lib/date-range";

export function AnalyticsPageClient() {
  const initialRange = useMemo(() => getLastSixMonthsRange(), []);
  const { metrics, range, setRange, loading, error, kommoConfigured, refetch } =
    useAnalyticsMetrics(initialRange);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const showSkeleton = loading && !metrics;
  const isRefreshing = loading && Boolean(metrics);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await refetch();
    } finally {
      setRefreshing(false);
    }
  }, [refetch]);

  if (!metrics && !loading) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center bg-[#eef2f7] px-4 py-12 text-center text-sm text-slate-500">
        {error ? (
          <div className="mx-auto mb-4 max-w-lg rounded-2xl border border-red-200 bg-white px-4 py-3 text-red-800 shadow-sm">
            {error}
          </div>
        ) : (
          <div className="mb-3">Nenhuma métrica disponível.</div>
        )}
        {!kommoConfigured ? (
          <p className="mb-4 max-w-md text-xs text-slate-400">
            Vincule uma integração Kommo à sua conta em Usuários. Se já estiver vinculada, confira se{" "}
            <code className="text-[11px]">APP_ENCRYPTION_KEY</code> é a mesma em todos os ambientes e
            recadastre o access token da integração.
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
        title="Analytics"
        subtitle={metrics?.periodLabel ?? "Análise aprofundada do funil e comportamento dos leads"}
        dateRange={range}
        onDateRangeChange={setRange}
        onRefresh={kommoConfigured ? handleRefresh : undefined}
        refreshing={refreshing}
        onMenuClick={() => setMobileMenuOpen(true)}
        showPeriodPicker={false}
      />

      <div className="border-b border-slate-200/80 bg-white px-4 py-4 sm:px-6 lg:px-8">
        <AnalyticsDatePicker value={range} onChange={setRange} />
      </div>

      {error && metrics ? (
        <div className="mx-4 mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-2 text-sm text-amber-900 sm:mx-6 lg:mx-8">
          {error}
        </div>
      ) : null}

      {isRefreshing ? (
        <p className="px-6 py-2 text-center text-xs text-slate-500">Atualizando analytics…</p>
      ) : null}

      <div
        className={`space-y-6 px-4 py-6 sm:px-6 lg:px-8 ${isRefreshing ? "pointer-events-none opacity-60" : ""}`}
      >
        <AnalyticsSection
          title="Tempo para fechamento" 
          subtitle="Negócios ganhos fechados no período — da criação ao fechamento"
        >
          {showSkeleton || !metrics ? (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
                {Array.from({ length: 4 }).map((_, i) => (
                  <AnalyticsSkeleton key={i} className="h-28" />
                ))}
              </div>
              <AnalyticsSkeleton className="h-56" />
            </div>
          ) : (
            <ClosingTimeKpi stats={metrics.closingTime} />
          )}
        </AnalyticsSection>

        <AnalyticsSection
          title="Coorte de leads"
          subtitle="Taxa de conversão acumulada por mês de entrada (últimos 6 meses)"
        >
          {showSkeleton || !metrics ? (
            <AnalyticsSkeleton className="h-64" />
          ) : (
            <CohortTable rows={metrics.cohort} columnAverages={metrics.cohortColumnAverages} />
          )}
        </AnalyticsSection>

        <AnalyticsSection title="Origem dos leads" subtitle="Distribuição por canal de origem no período">
          {showSkeleton || !metrics ? (
            <AnalyticsSkeleton className="h-48" />
          ) : (
            <LeadOriginChart rows={metrics.leadOrigins} />
          )}
        </AnalyticsSection>
      </div>
    </div>
  );
}
