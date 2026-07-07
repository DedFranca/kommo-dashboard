"use client";

import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { parseFileToPayload } from "@/lib/file-data-parser";
import { appendWidgetToLayout, createWidgetId, updateWidgetBinding } from "@/lib/layout-widgets";
import type { DashboardLayoutState, WidgetType, DashboardWidget } from "@/types/dashboard-layout";
import {
  BUILTIN_DATA_OPTIONS,
  WIDGET_TYPE_LABELS,
  type BuiltinDataKey,
  type CustomDataSource,
  type DashboardDataset,
  type DataBinding,
} from "@/types/data-source";

type Props = {
  open: boolean;
  onClose: () => void;
  layout: DashboardLayoutState;
  customSources: CustomDataSource[];
  datasets: DashboardDataset[];
  onLayoutChange: (next: DashboardLayoutState) => void;
  onSourceAdded: (source: CustomDataSource) => void;
};

export function AddWidgetDialog({
  open,
  onClose,
  layout,
  customSources,
  datasets,
  onLayoutChange,
  onSourceAdded,
}: Props) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [title, setTitle] = useState("");
  const [widgetType, setWidgetType] = useState<WidgetType>("kpi");
  const [dataMode, setDataMode] = useState<"builtin" | "file" | "existing" | "dataset">("builtin");
  const [builtinKey, setBuiltinKey] = useState<BuiltinDataKey>("newLeads");
  const [existingSourceId, setExistingSourceId] = useState("");
  const [datasetId, setDatasetId] = useState("");
  const [xKey, setXKey] = useState("");
  const [yKey, setYKey] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!open) return null;

  const builtinOptions = BUILTIN_DATA_OPTIONS.filter((o) => o.widgetTypes.includes(widgetType));
  const existingForType = customSources.filter((s) => s.widgetType === widgetType);
  const datasetSupported =
    widgetType === "kpi" ||
    widgetType === "lineChart" ||
    widgetType === "barChart" ||
    widgetType === "areaChart" ||
    widgetType === "pieChart" ||
    widgetType === "rankingTable";
  const selectedDataset = datasets.find((d) => d.id === datasetId) ?? null;
  const columns = selectedDataset?.columns ?? [];
  const xCandidates = columns;
  const yCandidates = columns;
  const sourceModes = datasetSupported && datasets.length
    ? (["builtin", "file", "existing", "dataset"] as const)
    : (["builtin", "file", "existing"] as const);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const id = createWidgetId();
      let binding: DataBinding;
      let newSourceId: string | null = null;

      if (dataMode === "dataset") {
        if (!datasetId) throw new Error("Selecione um dataset importado.");
        if (widgetType !== "kpi" && !xKey) throw new Error("Selecione a coluna X.");
        if (!yKey) throw new Error("Selecione a coluna Y.");
        binding = { kind: "dataset", datasetId, xKey, yKey };
      } else if (dataMode === "file") {
        const file = fileRef.current?.files?.[0];
        if (!file) throw new Error("Selecione um arquivo JSON ou CSV.");
        const text = await file.text();
        const payload = parseFileToPayload(widgetType, file.name, text);

        const res = await fetch("/api/dashboard/data-sources", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: title || file.name,
            widgetType,
            fileName: file.name,
            payload: payload as any,
          }),
        });
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error((body as { error?: string }).error ?? "Falha ao salvar arquivo.");
        }
        const source = (await res.json()) as CustomDataSource;
        onSourceAdded(source);
        newSourceId = source.id;
        binding = { kind: "custom", sourceId: source.id };
      } else if (dataMode === "existing" && existingSourceId) {
        binding = { kind: "custom", sourceId: existingSourceId };
      } else {
        const key = builtinOptions.find((o) => o.key === builtinKey)?.key ?? builtinOptions[0]?.key;
        if (!key) throw new Error("Nenhuma fonte embutida compatível com este tipo de painel.");
        binding = { kind: "builtin", key };
      }

      let widget: DashboardWidget = {
        id,
        type: widgetType,
        title: title.trim() || WIDGET_TYPE_LABELS[widgetType],
        props: {} as Record<string, unknown>,
      };
      widget = updateWidgetBinding(widget, binding, widget.title);

      const next = appendWidgetToLayout(layout, widget);
      onLayoutChange(next);

      await fetch("/api/dashboard/layout", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ layout: next }),
      });

      setTitle("");
      setDataMode("builtin");
      setDatasetId("");
      setXKey("");
      setYKey("");
      if (newSourceId) setExistingSourceId(newSourceId);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao adicionar painel");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 p-4">
      <div
        className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-xl border border-border bg-white p-6 shadow-2xl dark:bg-slate-950"
        role="dialog"
        aria-labelledby="add-widget-title"
      >
        <h2 id="add-widget-title" className="text-lg font-semibold">
          Adicionar painel
        </h2>
        <p className="mt-1 text-sm text-slate-500">
          Escolha o tipo, vincule aos dados do sistema ou importe JSON/CSV.
        </p>

        <form className="mt-4 space-y-4" onSubmit={handleSubmit}>
          <div>
            <label className="mb-1 block text-sm font-medium">Título</label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Ex.: Novos leads" />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium">Tipo de painel</label>
            <select
              className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm dark:bg-slate-900"
              value={widgetType}
              onChange={(e) => setWidgetType(e.target.value as WidgetType)}
            >
              {(Object.keys(WIDGET_TYPE_LABELS) as WidgetType[]).map((t) => (
                <option key={t} value={t}>
                  {WIDGET_TYPE_LABELS[t]}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium">Fonte de dados</label>
            <div className="flex flex-wrap gap-2">
              {sourceModes.map((m) => (
                <button
                    key={m}
                    type="button"
                    onClick={() => setDataMode(m)}
                    className={`rounded-lg border px-3 py-1.5 text-sm ${
                      dataMode === m
                        ? "border-indigo-500 bg-indigo-50 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-200"
                        : "border-border"
                    }`}
                  >
                  {m === "builtin"
                    ? "Dados do sistema"
                    : m === "file"
                    ? "Importar arquivo"
                    : m === "existing"
                    ? "Fonte salva"
                    : "Dataset importado"}
                </button>
              ))}
            </div>
          </div>

          {dataMode === "builtin" ? (
            <select
              className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm dark:bg-slate-900"
              value={builtinKey}
              onChange={(e) => setBuiltinKey(e.target.value as BuiltinDataKey)}
            >
              {builtinOptions.map((o) => (
                <option key={o.key} value={o.key}>
                  {o.label}
                </option>
              ))}
            </select>
          ) : null}

          {dataMode === "existing" ? (
            <select
              className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm dark:bg-slate-900"
              value={existingSourceId}
              onChange={(e) => setExistingSourceId(e.target.value)}
            >
              <option value="">Selecione…</option>
              {existingForType.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} {s.fileName ? `(${s.fileName})` : ""}
                </option>
              ))}
            </select>
          ) : null}

          {dataMode === "dataset" ? (
            <div className="space-y-4">
              <select
                className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm dark:bg-slate-900"
                value={datasetId}
                onChange={(e) => setDatasetId(e.target.value)}
              >
                <option value="">Selecione…</option>
                {datasets.map((dataset: DashboardDataset) => (
                  <option key={dataset.id} value={dataset.id}>
                    {dataset.name}
                  </option>
                ))}
              </select>
              {datasetId ? (
                <div className="grid gap-3">
                  {widgetType !== "kpi" ? (
                    <div>
                      <label className="mb-1 block text-sm font-medium">Coluna X</label>
                      <select
                        className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm dark:bg-slate-900"
                        value={xKey}
                        onChange={(e) => setXKey(e.target.value)}
                      >
                        <option value="">Selecione…</option>
                        {xCandidates.map((column: string) => (
                          <option key={column} value={column}>
                            {column}
                          </option>
                        ))}
                      </select>
                    </div>
                  ) : null}
                  <div>
                    <label className="mb-1 block text-sm font-medium">Coluna Y</label>
                    <select
                      className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm dark:bg-slate-900"
                      value={yKey}
                      onChange={(e) => setYKey(e.target.value)}
                    >
                      <option value="">Selecione…</option>
                      {yCandidates.map((column: string) => (
                        <option key={column} value={column}>
                          {column}
                        </option>
                      ))}
                    </select>
                  </div>

                  {xKey && yKey && selectedDataset ? (
                    <div className="rounded-lg border border-border bg-slate-50 p-3 dark:bg-slate-900">
                      <p className="mb-2 text-xs font-semibold text-slate-600 dark:text-slate-300">
                        Preview dos dados (primeiras 5 linhas)
                      </p>
                      <div className="max-h-48 overflow-y-auto text-xs">
                        <table className="w-full border-collapse">
                          <thead>
                            <tr className="border-b border-border">
                              <th className="px-2 py-1 text-left font-medium">{xKey}</th>
                              <th className="px-2 py-1 text-left font-medium">{yKey}</th>
                            </tr>
                          </thead>
                          <tbody>
                            {selectedDataset.rows.slice(0, 5).map((row, idx) => (
                              <tr key={idx} className="border-b border-border/50">
                                <td className="px-2 py-1">{row[xKey] ?? "—"}</td>
                                <td className="px-2 py-1 font-mono text-slate-500">{row[yKey] ?? "—"}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  ) : null}
                </div>
              ) : null}
            </div>
          ) : null}

          {dataMode === "file" ? (
            <div className="rounded-lg border border-dashed border-border bg-slate-50 p-3 text-xs text-slate-600 dark:bg-slate-900 dark:text-slate-400">
              <p className="mb-2 font-medium">Formatos aceitos</p>
              <ul className="list-inside list-disc space-y-1">
                <li>KPI JSON: {`{ "value": 100 }`}</li>
                <li>Gráfico JSON: {`{ "data": [{ "label": "Jan", "value": 10 }] }`}</li>
                <li>Ranking CSV: primary, secondary, value</li>
              </ul>
              <input ref={fileRef} type="file" accept=".json,.csv,.txt" className="mt-3 w-full text-sm" />
            </div>
          ) : null}

          {error ? <p className="text-sm text-red-600">{error}</p> : null}

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="ghost" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Adicionando…" : "Adicionar ao dashboard"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
