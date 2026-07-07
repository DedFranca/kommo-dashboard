"use client";

import type { LucideIcon } from "lucide-react";
import { TrendingDown, TrendingUp } from "lucide-react";
import { Sparkline } from "@/components/dashboard/premium/sparkline";
import { formatDelta } from "@/lib/dashboard/premium-stats";
import type { KpiDelta } from "@/types/dashboard-metrics";
import { cn } from "@/lib/utils";

type Props = {
  title: string;
  value: string;
  delta?: KpiDelta | null;
  previousLabel?: string;
  icon: LucideIcon;
  iconBg: string;
  iconColor: string;
  sparkColor: string;
  sparkData: number[];
};

export function PremiumKpiCard({
  title,
  value,
  delta,
  previousLabel,
  icon: Icon,
  iconBg,
  iconColor,
  sparkColor,
  sparkData,
}: Props) {
  const changePct = delta?.changePct ?? null;
  const positive = changePct !== null && changePct > 0;
  const negative = changePct !== null && changePct < 0;

  return (
    <div className="flex flex-col rounded-2xl border border-slate-200/80 bg-white p-5 shadow-[0_8px_30px_rgba(15,23,42,0.06)]">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className={cn("flex h-10 w-10 items-center justify-center rounded-full", iconBg)}>
            <Icon className={cn("h-5 w-5", iconColor)} strokeWidth={2} />
          </span>
          <p className="text-sm font-medium text-slate-500">{title}</p>
        </div>
      </div>

      <p className="mt-4 text-3xl font-bold tracking-tight text-slate-900">{value}</p>

      {delta ? (
        <div className="mt-2 flex flex-wrap items-center gap-1.5 text-xs">
          {changePct !== null ? (
            <span
              className={cn(
                "inline-flex items-center gap-0.5 font-semibold",
                positive && "text-emerald-600",
                negative && "text-rose-600",
                !positive && !negative && "text-slate-500",
              )}
            >
              {positive ? <TrendingUp className="h-3.5 w-3.5" /> : negative ? <TrendingDown className="h-3.5 w-3.5" /> : null}
              {formatDelta(changePct)}
            </span>
          ) : null}
          <span className="text-slate-400">
            {previousLabel ? `vs ${previousLabel}` : "vs mês anterior"}
          </span>
        </div>
      ) : null}

      <div className="mt-4 -mx-1">
        <Sparkline data={sparkData} color={sparkColor} />
      </div>
    </div>
  );
}
