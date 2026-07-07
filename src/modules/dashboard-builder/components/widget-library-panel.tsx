"use client";

import { useState } from "react";
import {
  getAvailableWidgets,
  WIDGET_CATEGORIES,
  type WidgetCatalogEntry,
  type WidgetCategory,
} from "@/modules/widget-engine/widget-catalog";
import type { WidgetTemplate } from "@/lib/widget-factory";
import type { WidgetType } from "@/types/dashboard-layout";

type Props = {
  onAddWidget: (type: WidgetType, label: string) => void;
  /** @deprecated Modelos Kommo removidos — mantido por compatibilidade de assinatura. */
  onAddTemplate?: (template: WidgetTemplate) => void;
  onClose?: () => void;
};

export function WidgetLibraryPanel({ onAddWidget, onClose }: Props) {
  const [addedId, setAddedId] = useState<string | null>(null);

  const flash = (id: string) => {
    setAddedId(id);
    setTimeout(() => setAddedId(null), 1200);
  };

  return (
    <aside className="flex h-full w-60 shrink-0 flex-col border-r border-border bg-white dark:bg-slate-950/90">
      <div className="flex items-center justify-between border-b border-border px-3 py-2.5">
        <div>
          <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">Adicionar widget</h3>
          <p className="text-[10px] text-slate-400">Clique para inserir no canvas</p>
        </div>
        {onClose ? (
          <button type="button" onClick={onClose} className="text-slate-400 hover:text-slate-600" aria-label="Fechar">
            ✕
          </button>
        ) : null}
      </div>

      <div className="flex-1 overflow-y-auto p-2">
        {WIDGET_CATEGORIES.map((category) => (
          <WidgetCategorySection
            key={category.id}
            category={category.id}
            label={category.label}
            addedId={addedId}
            onFlash={flash}
            onAddWidget={onAddWidget}
          />
        ))}
      </div>
    </aside>
  );
}

function WidgetCategorySection({
  category,
  label,
  addedId,
  onFlash,
  onAddWidget,
}: {
  category: WidgetCategory;
  label: string;
  addedId: string | null;
  onFlash: (id: string) => void;
  onAddWidget: (type: WidgetType, label: string) => void;
}) {
  const items = getAvailableWidgets().filter((w) => w.category === category);
  if (!items.length) return null;

  return (
    <section className="mb-4">
      <p className="mb-1.5 px-1 text-[10px] font-semibold uppercase tracking-wider text-slate-400">{label}</p>
      <div className="space-y-1">
        {items.map((entry) => (
          <WidgetLibraryItem
            key={entry.type}
            entry={entry}
            highlighted={addedId === entry.type}
            onAdd={() => {
              onAddWidget(entry.type as WidgetType, entry.label);
              onFlash(entry.type);
            }}
          />
        ))}
      </div>
    </section>
  );
}

function WidgetLibraryItem({
  entry,
  highlighted,
  onAdd,
}: {
  entry: WidgetCatalogEntry;
  highlighted: boolean;
  onAdd: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onAdd}
      className={`flex w-full items-start gap-2 rounded-lg px-2 py-2 text-left transition-colors hover:bg-indigo-50 dark:hover:bg-indigo-950/30 ${
        highlighted ? "bg-emerald-50 ring-1 ring-emerald-400 dark:bg-emerald-950/30" : ""
      }`}
      title={entry.description}
    >
      <span className="text-base leading-none">{entry.icon}</span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-xs font-medium text-slate-800 dark:text-slate-200">{entry.label}</p>
        <p className="truncate text-[10px] text-slate-400">{entry.description}</p>
      </div>
    </button>
  );
}
