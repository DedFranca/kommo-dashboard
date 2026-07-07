"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { DatasetSelector } from "@/components/analytics/dataset-selector";
import { useDataSources, type DataSourceListItem } from "@/hooks/use-data-sources";

type Props = {
  /** Incrementado pela página após uma importação para forçar refetch. */
  refreshSignal?: number;
  canImport?: boolean;
  onImportClick?: () => void;
  /** Visualizador ou modo leitura — oculta ações destrutivas. */
  readOnly?: boolean;
};

export function DataSourcesBar({ refreshSignal = 0, canImport, onImportClick, readOnly = false }: Props) {
  const { sources, datasets, kommoConfigured, loading, refresh } = useDataSources();

  useEffect(() => {
    if (refreshSignal > 0) void refresh();
  }, [refreshSignal, refresh]);

  const handleDelete = async (source: DataSourceListItem) => {
    if (source.kind !== "dataset") return;
    if (!confirm(`Remover a fonte "${source.name}"? Os widgets que a usam ficarão sem dados.`)) return;
    const res = await fetch(`/api/analytics/datasets/${source.id}`, { method: "DELETE" });
    if (res.ok) void refresh();
  };

  return (
    <section className="rounded-lg border border-border bg-white p-3 shadow-sm dark:bg-slate-950/80">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-sm font-semibold text-slate-800 dark:text-slate-200">Fontes de dados</h2>
          <p className="text-[11px] text-slate-500 dark:text-slate-400">
            Kommo conectado + datasets importados. Use no painel de configuração de cada widget.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button type="button" variant="outline" className="text-xs" onClick={() => void refresh()} disabled={loading}>
            {loading ? "Atualizando…" : "Atualizar"}
          </Button>
          {canImport ? (
            <Button type="button" className="text-xs" onClick={onImportClick}>
              + Importar dataset
            </Button>
          ) : null}
        </div>
      </div>

      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <span
            className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium ${
              kommoConfigured
                ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300"
                : "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400"
            }`}
          >
            <span className={`h-1.5 w-1.5 rounded-full ${kommoConfigured ? "bg-emerald-500" : "bg-slate-400"}`} />
            Kommo {kommoConfigured ? "conectado" : "não configurado"}
          </span>
          <span className="text-[11px] text-slate-400">
            {datasets.length} dataset{datasets.length === 1 ? "" : "s"} importado{datasets.length === 1 ? "" : "s"}
          </span>
        </div>

        <DatasetSelector
          sources={sources}
          onDelete={readOnly ? undefined : handleDelete}
          emptyHint="Conecte o Kommo ou importe um CSV / Google Sheets para começar."
        />
      </div>
    </section>
  );
}
