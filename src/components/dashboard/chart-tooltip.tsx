"use client";

type TooltipEntry = {
  name?: string;
  value?: number | string;
  dataKey?: string | number;
  color?: string;
  payload?: Record<string, unknown>;
};

type Props = {
  active?: boolean;
  label?: string | number;
  payload?: TooltipEntry[];
  /** Rótulo da série quando há apenas uma (ex.: "Leads", "Vendas") */
  valueLabel?: string;
  /** Linhas extras abaixo do valor principal */
  footer?: string;
};

const boxClass =
  "rounded-lg border border-slate-200 bg-white/95 px-3 py-2 text-xs shadow-sm dark:border-slate-700 dark:bg-slate-900/95";

export function SingleSeriesTooltip({ active, label, payload, valueLabel, footer }: Props) {
  if (!active || !payload?.length) return null;
  const entry = payload[0];
  const value = Number(entry.value ?? 0);
  const series = valueLabel ?? entry.name ?? "Valor";

  return (
    <div className={boxClass}>
      {label != null && label !== "" ? (
        <p className="mb-1 font-semibold capitalize text-slate-800 dark:text-slate-100">{label}</p>
      ) : null}
      <p className="text-slate-600 dark:text-slate-300">
        <span className="font-semibold text-slate-900 dark:text-white">{value.toLocaleString("pt-BR")}</span>{" "}
        {series}
      </p>
      {footer ? <p className="mt-1 text-[10px] text-slate-400">{footer}</p> : null}
    </div>
  );
}

export function MultiSeriesTooltip({ active, label, payload }: Props) {
  if (!active || !payload?.length) return null;
  const fullName = (payload[0].payload?.fullName as string | undefined) ?? String(label ?? "");

  return (
    <div className={boxClass}>
      <p className="mb-1.5 font-semibold text-slate-800 dark:text-slate-100">{fullName}</p>
      {payload.map((entry) => (
        <p key={String(entry.dataKey)} className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
          <span className="inline-block h-2 w-2 rounded-full" style={{ backgroundColor: entry.color }} />
          <span>{entry.name}:</span>
          <span className="font-semibold text-slate-900 dark:text-white">
            {Number(entry.value ?? 0).toLocaleString("pt-BR")}
          </span>
        </p>
      ))}
    </div>
  );
}

export function PieSliceTooltip({
  active,
  payload,
  total,
  valueLabel = "leads",
}: {
  active?: boolean;
  payload?: TooltipEntry[];
  total: number;
  valueLabel?: string;
}) {
  if (!active || !payload?.[0]) return null;
  const item = payload[0].payload as { name?: string; value?: number };
  const name = item.name ?? "—";
  const value = Number(item.value ?? 0);
  const pct = total > 0 ? ((value / total) * 100).toFixed(1) : "0";

  return (
    <div className={boxClass}>
      <p className="mb-1 font-semibold text-slate-800 dark:text-slate-100">{name}</p>
      <p className="text-slate-600 dark:text-slate-300">
        <span className="font-semibold text-slate-900 dark:text-white">{value.toLocaleString("pt-BR")}</span>{" "}
        {valueLabel} ({pct}%)
      </p>
    </div>
  );
}

export function FunnelStageTooltip({ active, payload }: { active?: boolean; payload?: TooltipEntry[] }) {
  if (!active || !payload?.[0]) return null;
  const item = payload[0].payload as { name?: string; value?: number; pct?: number };
  const name = item.name ?? "—";
  const value = Number(item.value ?? 0);
  const pct = Number(item.pct ?? 0);

  return (
    <div className={boxClass}>
      <p className="mb-1 font-semibold text-slate-800 dark:text-slate-100">{name}</p>
      <p className="text-slate-600 dark:text-slate-300">
        <span className="font-semibold text-slate-900 dark:text-white">{value.toLocaleString("pt-BR")}</span>{" "}
        negócios
      </p>
      <p className="mt-0.5 text-[10px] text-slate-400">{pct.toFixed(1)}% dos leads criados no período</p>
    </div>
  );
}
