"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";

type SelectablePreset = { id: string; name: string; description?: string };

type Props = {
  presets: SelectablePreset[];
  activePresetId?: string;
  onSelectPreset: (presetId: string) => Promise<void>;
  onCreatePreset?: () => void;
  onDeletePreset?: (presetId: string) => void;
  loading?: boolean;
};

export function LayoutSelector({
  presets,
  activePresetId,
  onSelectPreset,
  onCreatePreset,
  onDeletePreset,
  loading = false,
}: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    const onPointerDown = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setIsOpen(false);
    };
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, [isOpen]);

  const handleSelectPreset = useCallback(
    async (presetId: string) => {
      setLoadingId(presetId);
      try {
        await onSelectPreset(presetId);
        setIsOpen(false);
      } finally {
        setLoadingId(null);
      }
    },
    [onSelectPreset],
  );

  const activePreset = presets.find((p) => p.id === activePresetId);

  return (
    <div ref={rootRef} className="relative inline-block">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        disabled={loading}
        className="inline-flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50 dark:text-slate-200 dark:hover:bg-slate-800"
      >
        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M4 6a2 2 0 012-2h12a2 2 0 012 2v12a2 2 0 01-2 2H6a2 2 0 01-2-2V6z"
          />
        </svg>
        <span>{activePreset?.name || "Selecionar layout"}</span>
        <svg
          className={`h-4 w-4 transition-transform ${isOpen ? "rotate-180" : ""}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen ? (
        <div className="absolute left-0 top-full z-50 mt-2 w-72 origin-top-left rounded-lg border border-border bg-white shadow-xl dark:bg-slate-950">
          <div className="max-h-96 space-y-1 overflow-y-auto p-2">
            {presets.length === 0 ? (
              <p className="px-3 py-2 text-sm text-slate-500">Nenhum layout salvo ainda.</p>
            ) : (
              presets.map((preset) => (
                <div
                  key={preset.id}
                  className={`group flex items-center gap-1 rounded-lg pr-1 transition-colors ${
                    activePresetId === preset.id
                      ? "bg-indigo-50 dark:bg-indigo-900/20"
                      : "hover:bg-slate-100 dark:hover:bg-slate-800"
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => handleSelectPreset(preset.id)}
                    disabled={loadingId === preset.id}
                    className={`flex-1 rounded-lg px-3 py-2 text-left text-sm ${
                      activePresetId === preset.id
                        ? "text-indigo-900 dark:text-indigo-100"
                        : "text-slate-700 dark:text-slate-300"
                    } ${loadingId === preset.id ? "opacity-50" : ""}`}
                  >
                    <div className="font-medium">{preset.name}</div>
                    {preset.description ? (
                      <div className="text-xs opacity-75">{preset.description}</div>
                    ) : null}
                  </button>
                  {onDeletePreset ? (
                    <button
                      type="button"
                      onClick={() => onDeletePreset(preset.id)}
                      className="shrink-0 rounded-md p-1.5 text-slate-300 opacity-0 transition hover:bg-red-50 hover:text-red-500 group-hover:opacity-100 dark:hover:bg-red-950/40"
                      aria-label={`Apagar layout ${preset.name}`}
                      title="Apagar layout"
                    >
                      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                        />
                      </svg>
                    </button>
                  ) : null}
                </div>
              ))
            )}

            {onCreatePreset ? (
              <div className="border-t border-border pt-2">
                <Button
                  type="button"
                  onClick={() => {
                    setIsOpen(false);
                    onCreatePreset();
                  }}
                  className="w-full text-sm"
                  variant="outline"
                >
                  + Novo Layout
                </Button>
              </div>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}
