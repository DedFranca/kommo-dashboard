"use client";

import { cn } from "@/lib/utils";
import type { KpiDelta } from "@/types/dashboard-metrics";

type Props = {
  title: string;
  value: string;
  hint?: string;
  delta?: KpiDelta;
  previousLabel?: string;
  accent?: "default" | "primary" | "success" | "warning" | "danger";
};

function formatDelta(changePct: number | null): { text: string; tone: "up" | "down" | "neutral" } {
  if (changePct === null) return { text: "—", tone: "neutral" };
  if (changePct > 0) return { text: `+${changePct.toFixed(1).replace(".", ",")}%`, tone: "up" };
  if (changePct < 0) return { text: `${changePct.toFixed(1).replace(".", ",")}%`, tone: "down" };
  return { text: "0%", tone: "neutral" };
}

export function ExecutiveKpiCard({ title, value, hint, delta, previousLabel, accent = "default" }: Props) {
  const change = delta ? formatDelta(delta.changePct) : null;

  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-xl border bg-white p-5 shadow-sm transition-shadow hover:shadow-md dark:bg-slate-950/90",
        accent === "primary" && "border-indigo-200 dark:border-indigo-900",
        accent === "success" && "border-emerald-200 dark:border-emerald-900",
        accent === "warning" && "border-amber-200 dark:border-amber-900",
        accent === "danger" && "border-rose-200 dark:border-rose-900",
        accent === "default" && "border-slate-200 dark:border-slate-800",
      )}
    >
      <div
        className={cn(
          "absolute inset-x-0 top-0 h-1",
          accent === "primary" && "bg-indigo-500",
          accent === "success" && "bg-emerald-500",
          accent === "warning" && "bg-amber-500",
          accent === "danger" && "bg-rose-500",
          accent === "default" && "bg-slate-300 dark:bg-slate-600",
        )}
      />
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">{title}</p>
      <p className="mt-2 text-3xl font-bold tracking-tight text-slate-900 dark:text-white">{value}</p>
      {change ? (
        <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
          <span
            className={cn(
              "inline-flex items-center rounded-full px-2 py-0.5 font-semibold",
              change.tone === "up" && "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200",
              change.tone === "down" && "bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-200",
              change.tone === "neutral" && "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300",
            )}
          >
            {change.text}
          </span>
          {previousLabel ? (
            <span className="text-slate-400">vs {previousLabel}</span>
          ) : delta ? (
            <span className="text-slate-400">anterior: {delta.previousValue.toLocaleString("pt-BR")}</span>
          ) : null}
        </div>
      ) : null}
      {hint ? <p className="mt-2 text-[11px] leading-relaxed text-slate-500 dark:text-slate-400">{hint}</p> : null}
    </div>
  );
}
