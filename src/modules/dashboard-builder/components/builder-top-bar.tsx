"use client";

import { Button } from "@/components/ui/button";
import type { BuilderMode } from "../types";

type Props = {
  mode: BuilderMode;
  onModeChange: (mode: BuilderMode) => void;
  dirty?: boolean;
  saving?: boolean;
  autoSaveEnabled?: boolean;
  onToggleAutoSave?: () => void;
  leftPanelOpen?: boolean;
  rightPanelOpen?: boolean;
  onToggleLeftPanel?: () => void;
  onToggleRightPanel?: () => void;
  snapToGrid?: boolean;
  onToggleSnapToGrid?: () => void;
  canEdit?: boolean;
};

export function BuilderTopBar({
  mode,
  onModeChange,
  dirty,
  saving,
  autoSaveEnabled = true,
  leftPanelOpen,
  rightPanelOpen,
  onToggleLeftPanel,
  onToggleRightPanel,
  snapToGrid,
  onToggleSnapToGrid,
  canEdit = true,
}: Props) {
  if (!canEdit) return null;

  return (
    <div className="flex flex-wrap items-center gap-2 rounded-lg border border-border bg-white px-3 py-2 shadow-sm dark:bg-slate-950/80">
      <div className="flex rounded-lg border border-border p-0.5">
        <button
          type="button"
          onClick={() => onModeChange("view")}
          className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
            mode === "view"
              ? "bg-indigo-600 text-white"
              : "text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
          }`}
        >
          Visualização
        </button>
        <button
          type="button"
          onClick={() => onModeChange("edit")}
          className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
            mode === "edit"
              ? "bg-indigo-600 text-white"
              : "text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
          }`}
        >
          Edição
        </button>
      </div>

      {mode === "edit" ? (
        <>
          {onToggleLeftPanel ? (
            <Button type="button" variant="outline" className="text-xs px-2 py-1" onClick={onToggleLeftPanel}>
              {leftPanelOpen ? "◀ Widgets" : "▶ Widgets"}
            </Button>
          ) : null}
          {onToggleRightPanel ? (
            <Button type="button" variant="outline" className="text-xs px-2 py-1" onClick={onToggleRightPanel}>
              {rightPanelOpen ? "Propriedades ▶" : "◀ Propriedades"}
            </Button>
          ) : null}
          {onToggleSnapToGrid ? (
            <button
              type="button"
              onClick={onToggleSnapToGrid}
              className={`rounded-lg border px-2 py-1.5 text-xs transition-colors ${
                snapToGrid
                  ? "border-indigo-300 bg-indigo-50 text-indigo-700 dark:border-indigo-800 dark:bg-indigo-950/40 dark:text-indigo-300"
                  : "border-border text-slate-600 dark:text-slate-400"
              }`}
            >
              Snap to grid
            </button>
          ) : null}
        </>
      ) : null}

      <div className="ml-auto flex items-center gap-2">
        {saving ? (
          <span className="text-xs text-slate-500">Salvando…</span>
        ) : dirty ? (
          <span className="text-xs text-amber-600 dark:text-amber-400">Alterações pendentes</span>
        ) : autoSaveEnabled ? (
          <span className="text-xs text-emerald-600 dark:text-emerald-400">Salvo</span>
        ) : null}
      </div>
    </div>
  );
}
