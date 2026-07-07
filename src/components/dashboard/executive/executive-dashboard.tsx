"use client";

import { useMemo, useState } from "react";
import { DollarSign, Percent, UserCheck, Users } from "lucide-react";
import { BottomStatsRow } from "@/components/dashboard/premium/bottom-stats-row";
import { LeadsConsultasChart } from "@/components/dashboard/premium/leads-consultas-chart";
import { PremiumKpiCard } from "@/components/dashboard/premium/premium-kpi-card";
import {
  buildComparativeSeries,
  computeBottomStats,
  formatCurrencyBRL,
} from "@/lib/dashboard/premium-stats";
import type { ChartGrouping } from "@/lib/kommo/executive-metrics";
import type { DashboardMetrics } from "@/types/dashboard-metrics";

type Props = {
  metrics: DashboardMetrics;
};

function seriesValues(points: { value: number }[]): number[] {
  return points.map((p) => p.value);
}

export function ExecutiveDashboard({ metrics }: Props) {
  const prev = metrics.previousPeriodLabel;
  const [chartGrouping, setChartGrouping] = useState<ChartGrouping>("month");

  const monthlyTrendLeads = metrics.leadsOverTime;
  const monthlyTrendSales = metrics.salesOverTime;

  const chartLeads =
    chartGrouping === "week" ? metrics.chartLeadsWeek : monthlyTrendLeads;
  const chartSales =
    chartGrouping === "week" ? metrics.chartSalesWeek : monthlyTrendSales;

  const comparativeData = useMemo(
    () => buildComparativeSeries(chartLeads, chartSales),
    [chartLeads, chartSales],
  );

  const bottomStats = useMemo(
    () =>
      computeBottomStats(monthlyTrendLeads, monthlyTrendSales, {
        bestMonthLeads: metrics.bestMonthLeadsAllTime,
        bestMonthConsultas: metrics.bestMonthConsultasAllTime,
      }),
    [monthlyTrendLeads, monthlyTrendSales, metrics.bestMonthLeadsAllTime, metrics.bestMonthConsultasAllTime],
  );

  const sparkTrend = useMemo(
    () => buildComparativeSeries(metrics.leadsOverTime, metrics.salesOverTime),
    [metrics.leadsOverTime, metrics.salesOverTime],
  );

  const leadsSpark = seriesValues(metrics.leadsOverTime);
  const consultasSpark = seriesValues(metrics.salesOverTime);
  const revenueSpark = seriesValues(metrics.revenueOverTime ?? []);
  const conversionSpark = useMemo(
    () => sparkTrend.map((d) => (d.leads > 0 ? Math.round((d.consultas / d.leads) * 10000) / 100 : 0)),
    [sparkTrend],
  );

  return (
    <div className="space-y-6 px-4 py-6 sm:px-6 lg:px-8">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <PremiumKpiCard
          title="Total de Leads"
          value={metrics.totalLeads.toLocaleString("pt-BR")}
          delta={metrics.kpiDeltas.totalLeads}
          previousLabel={prev}
          icon={Users}
          iconBg="bg-blue-100"
          iconColor="text-blue-600"
          sparkColor="#3b82f6"
          sparkData={leadsSpark.length ? leadsSpark : [0]}
        />
        <PremiumKpiCard
          title="Ganho Mensal"
          value={formatCurrencyBRL(metrics.monthlyRevenue ?? 0)}
          delta={metrics.kpiDeltas.monthlyRevenue}
          previousLabel={prev}
          icon={DollarSign}
          iconBg="bg-emerald-100"
          iconColor="text-emerald-600"
          sparkColor="#22c55e"
          sparkData={revenueSpark.length ? revenueSpark : [metrics.monthlyRevenue ?? 0]}
        />
        <PremiumKpiCard
          title="Taxa de Conversão"
          value={`${metrics.conversionRate.toFixed(2).replace(".", ",")}%`}
          delta={metrics.kpiDeltas.conversionRate}
          previousLabel={prev}
          icon={Percent}
          iconBg="bg-violet-100"
          iconColor="text-violet-600"
          sparkColor="#8b5cf6"
          sparkData={conversionSpark.length ? conversionSpark : [metrics.conversionRate]}
        />
        <PremiumKpiCard
          title="Consultas Fechadas"
          value={metrics.wonLeads.toLocaleString("pt-BR")}
          delta={metrics.kpiDeltas.wonLeads}
          previousLabel={prev}
          icon={UserCheck}
          iconBg="bg-amber-100"
          iconColor="text-amber-600"
          sparkColor="#f59e0b"
          sparkData={consultasSpark.length ? consultasSpark : [metrics.wonLeads]}
        />
      </div>

      <LeadsConsultasChart
        data={comparativeData}
        grouping={chartGrouping}
        onGroupingChange={setChartGrouping}
      />

      <BottomStatsRow
        stats={bottomStats}
        leadsSpark={leadsSpark.length ? leadsSpark : [0]}
        consultasSpark={consultasSpark.length ? consultasSpark : [0]}
      />
    </div>
  );
}
