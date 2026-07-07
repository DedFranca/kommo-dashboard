"use client";

import { Input } from "@/components/ui/input";

type Props = {
  title?: string;
  editable: boolean;
  onTitleChange: (title: string) => void;
};

export function AnalyticsCanvasHeader({ title, editable, onTitleChange }: Props) {
  if (editable) {
    return (
      <div className="mb-3 px-1">
        <Input
          value={title ?? ""}
          onChange={(e) => onTitleChange(e.target.value)}
          placeholder="Título do painel (opcional)"
          className="border-transparent bg-white/80 text-lg font-semibold shadow-sm focus-visible:border-indigo-300 dark:bg-slate-950/80"
          maxLength={120}
        />
        <p className="mt-1 px-1 text-xs text-slate-500">Exibido acima dos widgets neste layout.</p>
      </div>
    );
  }

  if (!title?.trim()) return null;

  return (
    <div className="mb-3 px-1">
      <h2 className="text-lg font-semibold tracking-tight text-slate-800 dark:text-slate-100">{title}</h2>
    </div>
  );
}
