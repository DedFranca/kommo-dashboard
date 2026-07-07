"use client";

import type { DataSourceListItem } from "@/hooks/use-data-sources";
import { DATA_SOURCE_TYPE_ICONS } from "@/types/data-source-registry";

type Props = {
  sources: DataSourceListItem[];
  selectedId?: string | null;
  onSelect?: (source: DataSourceListItem) => void;
  onDelete?: (source: DataSourceListItem) => void;
  emptyHint?: string;
};

export function DatasetSelector({ sources, selectedId, onSelect, onDelete, emptyHint }: Props) {
  if (!sources.length) {
    return (
      <p className="text-xs text-slate-500 dark:text-slate-400">
        {emptyHint ?? "Nenhuma fonte conectada ainda."}
      </p>
    );
  }

  return (
    <div className="flex flex-wrap gap-2">
      {sources.map((source) => {
        const selected = selectedId === source.id;
        return (
          <div
            key={source.id}
            className={`group flex items-center gap-2 rounded-lg border px-3 py-2 transition-colors ${
              selected
                ? "border-indigo-500 bg-indigo-50 dark:bg-indigo-950/30"
                : "border-border bg-white hover:border-indigo-300 dark:bg-slate-950"
            }`}
          >
            <button
              type="button"
              onClick={() => onSelect?.(source)}
              className="flex items-center gap-2 text-left"
              title={source.description}
            >
              <span className="text-base leading-none">{DATA_SOURCE_TYPE_ICONS[source.type]}</span>
              <span className="min-w-0">
                <span className="block max-w-[160px] truncate text-xs font-medium text-slate-800 dark:text-slate-200">
                  {source.name}
                </span>
                <span className="block text-[10px] text-slate-400">
                  {source.fieldCount} campos{source.refreshable ? " · atualizável" : ""}
                </span>
              </span>
            </button>
            {onDelete && source.kind === "dataset" ? (
              <button
                type="button"
                onClick={() => onDelete(source)}
                className="text-slate-300 opacity-0 transition-opacity hover:text-red-500 group-hover:opacity-100"
                aria-label={`Remover ${source.name}`}
              >
                ✕
              </button>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}
