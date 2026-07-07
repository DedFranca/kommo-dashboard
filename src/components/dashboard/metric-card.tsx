import { Card } from "@/components/ui/card";

type Props = {
  title: string;
  value: string;
  hint?: string;
};

export function MetricCard({ title, value, hint }: Props) {
  return (
    <Card className="flex h-full flex-col justify-between">
      <p className="text-sm font-medium text-slate-500 dark:text-slate-400">{title}</p>
      <p className="mt-2 text-3xl font-semibold tracking-tight text-slate-900 dark:text-white">{value}</p>
      {hint ? <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{hint}</p> : null}
    </Card>
  );
}
