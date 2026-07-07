"use client";

import { useEffect, useRef, useState } from "react";
import { Popover } from "@/components/ui/popover";
import { updateWidgetBinding } from "@/lib/layout-widgets";
import type { DashboardWidget } from "@/types/dashboard-layout";
import {
  BUILTIN_DATA_OPTIONS,
  type BuiltinDataKey,
  type CustomDataSource,
  type DashboardDataset,
} from "@/types/data-source";

type Props = {
  widget: DashboardWidget;
  customSources: CustomDataSource[];
  datasets: DashboardDataset[];
  onUpdate: (widget: DashboardWidget) => void;
  onSourceAdded: (source: CustomDataSource) => void;
  onDatasetAdded: (dataset: DashboardDataset) => void;
  onRemove: () => void;
};

export function WidgetSettingsMenu({
  widget,
  customSources,
  datasets,
  onUpdate,
  onSourceAdded,
  onDatasetAdded,
  onRemove,
}: Props) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const [datasetId, setDatasetId] = useState("");
  const [xKey, setXKey] = useState("");
  const [yKey, setYKey] = useState("");

  const datasetSupported =
    widget.type === "kpi" ||
    widget.type === "lineChart" ||
    widget.type === "barChart" ||
    widget.type === "areaChart" ||
    widget.type === "pieChart" ||
    widget.type === "rankingTable";

  const builtinOptions = BUILTIN_DATA_OPTIONS.filter((o) => o.widgetTypes.includes(widget.type));
  const existingForType = customSources.filter((s) => s.widgetType === widget.type);

  const selectedDataset = datasets.find((d) => d.id === datasetId) ?? null;
  const columns = selectedDataset?.columns ?? [];
  const xCandidates = columns;
  const yCandidates = columns;

  useEffect(() => {
    if (!open || !datasetSupported) return;
    if (!datasetId) {
      setXKey("");
      setYKey("");
      return;
    }

    if (!selectedDataset) return;
    if (!xKey) setXKey(selectedDataset.columns[0] ?? "");
    if (!yKey) setYKey(selectedDataset.columns[1] ?? selectedDataset.columns[0] ?? "");
  }, [open, datasetSupported, datasetId, selectedDataset, xKey, yKey]);

  async function setBuiltin(key: BuiltinDataKey) {
    onUpdate(updateWidgetBinding(widget, { kind: "builtin", key }));
    setOpen(false);
  }

  async function setExisting(sourceId: string) {
    onUpdate(updateWidgetBinding(widget, { kind: "custom", sourceId }));
    setOpen(false);
  }

  async function uploadFile() {
    const file = fileRef.current?.files?.[0];
    if (!file) return;
    if (!file.name.toLowerCase().endsWith(".csv")) {
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const text = await file.text();
      const res = await fetch("/api/datasets/ingest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: `${widget.title} — ${file.name}`,
          fileName: file.name,
          text,
        }),
      });
      const body = (await res.json().catch(() => ({}))) as any;
      if (!res.ok) throw new Error(body?.error ?? "Falha ao importar dataset.");
      onDatasetAdded(body);
      setDatasetId(body.id);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  }

  async function applyDataset() {
    if (!datasetSupported || !datasetId || !yKey) return;
    if (widget.type !== "kpi" && !xKey) return;

    setLoading(true);
    try {
      onUpdate(updateWidgetBinding(widget, { kind: "dataset", datasetId, xKey, yKey }));
      setOpen(false);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="widget-no-drag relative">
      <button
        ref={buttonRef}
        type="button"
        className="rounded px-1.5 py-0.5 text-slate-400 hover:bg-slate-200 hover:text-slate-700 dark:hover:bg-slate-700 dark:hover:text-slate-200 transition-colors"
        onPointerDown={(e) => e.stopPropagation()}
        onClick={(e) => {
          e.stopPropagation();
          setOpen((o) => !o);
        }}
        aria-label="Configurar painel"
        title="Configurar painel"
      >
        ⚙
      </button>

      <Popover anchorRef={buttonRef} open={open} onClose={() => setOpen(false)} width={280}>
        <div className="space-y-3 text-sm">
          <div>
            <p className="mb-2 text-xs font-semibold text-slate-500">Vincular dados</p>
            <div className="grid gap-1">
              {builtinOptions.map((option) => (
                <button
                  key={option.key}
                  type="button"
                  className="rounded px-2 py-2 text-left text-xs hover:bg-slate-100 dark:hover:bg-slate-800"
                  onClick={() => setBuiltin(option.key)}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          {existingForType.length ? (
            <div>
              <p className="mb-1 text-xs font-semibold text-slate-500">Fontes salvas</p>
              <div className="grid gap-1">
                {existingForType.map((source) => (
                  <button
                    key={source.id}
                    type="button"
                    className="rounded px-2 py-2 text-left text-xs hover:bg-slate-100 dark:hover:bg-slate-800"
                    onClick={() => setExisting(source.id)}
                  >
                    {source.name}
                  </button>
                ))}
              </div>
            </div>
          ) : null}

          {datasetSupported ? (
            <div>
              <p className="mb-1 text-xs font-semibold text-slate-500">Usar dataset importado</p>
              <select
                className="w-full rounded border border-border bg-surface px-2 py-2 text-xs dark:bg-slate-900"
                value={datasetId}
                onChange={(e) => setDatasetId(e.target.value)}
              >
                <option value="">Selecione…</option>
                {datasets.map((dataset) => (
                  <option key={dataset.id} value={dataset.id}>
                    {dataset.name}
                  </option>
                ))}
              </select>

              {datasetId ? (
                <div className="mt-2 space-y-3">
                  {widget.type !== "kpi" ? (
                    <div>
                      <p className="mb-1 text-[10px] font-medium text-slate-500">Coluna X</p>
                      <select
                        className="w-full rounded border border-border bg-surface px-2 py-2 text-xs dark:bg-slate-900"
                        value={xKey}
                        onChange={(e) => setXKey(e.target.value)}
                      >
                        <option value="">Selecione…</option>
                        {xCandidates.map((column) => (
                          <option key={column} value={column}>
                            {column}
                          </option>
                        ))}
                      </select>
                    </div>
                  ) : null}

                  <div>
                    <p className="mb-1 text-[10px] font-medium text-slate-500">Coluna Y</p>
                    <select
                      className="w-full rounded border border-border bg-surface px-2 py-2 text-xs dark:bg-slate-900"
                      value={yKey}
                      onChange={(e) => setYKey(e.target.value)}
                    >
                      <option value="">Selecione…</option>
                      {yCandidates.map((column) => (
                        <option key={column} value={column}>
                          {column}
                        </option>
                      ))}
                    </select>
                  </div>

                  <button
                    type="button"
                    disabled={
                      loading ||
                      !datasetId ||
                      (widget.type !== "kpi" && !xKey) ||
                      !yKey
                    }
                    className="w-full rounded bg-indigo-600 px-2 py-2 text-xs text-white disabled:opacity-50 hover:bg-indigo-700 transition-colors"
                    onClick={applyDataset}
                  >
                    {loading ? "Aplicando…" : "Vincular ao widget"}
                  </button>
                </div>
              ) : null}
            </div>
          ) : null}

          <div>
            <p className="mb-1 text-xs font-semibold text-slate-500">Importar CSV</p>
            <input ref={fileRef} type="file" accept=".csv" className="w-full text-[10px]" />
            <button
              type="button"
              disabled={loading}
              className="mt-2 w-full rounded bg-indigo-600 px-2 py-2 text-xs text-white disabled:opacity-50 hover:bg-indigo-700 transition-colors"
              onClick={uploadFile}
            >
              {loading ? "Importando…" : "Importar dataset"}
            </button>
          </div>

          <button
            type="button"
            className="w-full rounded border border-red-200 px-2 py-2 text-xs text-red-600 hover:bg-red-50 dark:border-red-900 dark:hover:bg-red-950/30 transition-colors"
            onClick={() => {
              onRemove();
              setOpen(false);
            }}
          >
            Remover painel
          </button>
        </div>
      </Popover>
    </div>
  );
}
