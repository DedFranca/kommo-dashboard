import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { KpiDelta } from "@/types/data-source";

type Props = {
  title: string;
  value: string;
  hint?: string;
  accent?: "default" | "primary" | "success";
  delta?: KpiDelta;
};

export function KpiMetricCard({ title, value, hint, accent = "default", delta }: Props) {
  return (
    <Card
      className={cn(
        "flex h-full flex-col justify-center border-l-4 px-5 py-4",
        accent === "primary" && "border-l-indigo-500 bg-indigo-50/50 dark:bg-indigo-950/30",
        accent === "success" && "border-l-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/30",
        accent === "default" && "border-l-slate-300 bg-white dark:border-l-slate-600 dark:bg-slate-900/80",
      )}
    >
      <p className="text-sm font-medium text-slate-600 dark:text-slate-400">{title}</p>
      <p className="mt-2 text-4xl font-bold tracking-tight text-slate-900 dark:text-white">{value}</p>
      {delta ? <DeltaBadge delta={delta} /> : null}
      {hint ? <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">{hint}</p> : null}
    </Card>
  );
}

function DeltaBadge({ delta }: { delta: KpiDelta }) {
  const color =
    delta.direction === "up"
      ? "text-emerald-600 dark:text-emerald-400"
      : delta.direction === "down"
        ? "text-red-600 dark:text-red-400"
        : "text-slate-500 dark:text-slate-400";
  const arrow = delta.direction === "up" ? "▲" : delta.direction === "down" ? "▼" : "■";
  const pctText =
    delta.pct === null ? "—" : `${delta.pct > 0 ? "+" : ""}${delta.pct.toFixed(1)}%`;

  return (
    <div className="mt-2 flex items-center gap-1.5 text-xs">
      <span className={cn("font-semibold", color)}>
        {arrow} {pctText}
      </span>
      <span className="text-slate-400">{delta.label}</span>
    </div>
  );
}
