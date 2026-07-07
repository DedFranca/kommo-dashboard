"use client";

import { Sparkline } from "@/components/dashboard/premium/sparkline";
import type { BottomStats } from "@/lib/dashboard/premium-stats";
import { Calendar, TrendingUp } from "lucide-react";

type Props = {
  stats: BottomStats;
  leadsSpark: number[];
  consultasSpark: number[];
};

function StatCard({
  label,
  value,
  sub,
  spark,
  sparkColor,
  icon,
}: {
  label: string;
  value: string;
  sub?: string;
  spark?: number[];
  sparkColor?: string;
  icon?: React.ReactNode;
}) {
  return (
    <div className="flex min-w-[160px] flex-1 flex-col rounded-2xl border border-slate-200/80 bg-white px-5 py-4 shadow-[0_4px_20px_rgba(15,23,42,0.04)]">
      <p className="text-xs font-medium text-slate-500">{label}</p>
      <p className="mt-2 text-xl font-bold text-slate-900">{value}</p>
      {sub ? <p className="mt-0.5 text-xs text-slate-400">{sub}</p> : null}
      {spark && sparkColor ? (
        <div className="mt-3">
          <Sparkline data={spark} color={sparkColor} height={32} />
        </div>
      ) : null}
      {icon ? <div className="mt-2">{icon}</div> : null}
    </div>
  );
}

export function BottomStatsRow({ stats, leadsSpark, consultasSpark }: Props) {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
      <StatCard
        label="Média de Leads/Mês"
        value={stats.avgLeadsPerMonth.toLocaleString("pt-BR")}
        spark={leadsSpark}
        sparkColor="#3b82f6"
      />
      <StatCard
        label="Média de Consultas/Mês"
        value={stats.avgConsultasPerMonth.toLocaleString("pt-BR")}
        spark={consultasSpark}
        sparkColor="#22c55e"
      />
      <StatCard
        label="Melhor Mês (Leads)"
        value={stats.bestMonthLeads?.label ?? "—"}
        sub={stats.bestMonthLeads ? `${stats.bestMonthLeads.value.toLocaleString("pt-BR")} leads` : undefined}
        icon={<Calendar className="h-4 w-4 text-blue-500" />}
      />
      <StatCard
        label="Melhor Mês (Consultas)"
        value={stats.bestMonthConsultas?.label ?? "—"}
        sub={
          stats.bestMonthConsultas
            ? `${stats.bestMonthConsultas.value.toLocaleString("pt-BR")} consultas`
            : undefined
        }
        icon={<TrendingUp className="h-4 w-4 text-emerald-500" />}
      />
    </div>
  );
}
