"use client";

import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { DataSourcePreview } from "@/types/data-source-registry";

type Props = {
  open: boolean;
  onClose: () => void;
  onImported?: () => void;
};

type Mode = "upload" | "google_sheets";

type IngestResponse = {
  id: string;
  name: string;
  rowCount?: number;
  sample?: Record<string, string | null>[];
  preview?: DataSourcePreview;
  error?: string;
};

export function ImportDatasetDialog({ open, onClose, onImported }: Props) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [mode, setMode] = useState<Mode>("upload");
  const [name, setName] = useState("");
  const [sheetUrl, setSheetUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [preview, setPreview] = useState<DataSourcePreview | null>(null);

  if (!open) return null;

  function resetFeedback() {
    setError(null);
    setSuccess(null);
    setPreview(null);
  }

  function handleClose() {
    resetFeedback();
    setName("");
    setSheetUrl("");
    if (fileRef.current) fileRef.current.value = "";
    onClose();
  }

  function applyResult(body: IngestResponse, fallbackName: string) {
    const rows = body.preview?.rows ?? body.sample ?? [];
    const columns = body.preview?.columns ?? (rows[0] ? Object.keys(rows[0]) : []);
    setPreview({ columns, rows, rowCount: body.preview?.rowCount ?? body.rowCount ?? rows.length });
    setSuccess(`Dataset importado: ${body.name ?? fallbackName} (${body.rowCount ?? rows.length} linhas)`);
    onImported?.();
  }

  async function handleUpload(e: React.FormEvent) {
    e.preventDefault();
    resetFeedback();
    setLoading(true);
    try {
      const file = fileRef.current?.files?.[0];
      if (!file) throw new Error("Selecione um arquivo CSV.");
      if (!file.name.toLowerCase().endsWith(".csv")) throw new Error("Por enquanto, apenas CSV.");
      const text = await file.text();

      const res = await fetch("/api/analytics/ingest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim() || file.name, fileName: file.name, text }),
      });
      const body = (await res.json().catch(() => ({}))) as IngestResponse;
      if (!res.ok) throw new Error(body.error ?? "Falha ao importar dataset.");

      applyResult(body, file.name);
      if (fileRef.current) fileRef.current.value = "";
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao importar dataset");
    } finally {
      setLoading(false);
    }
  }

  async function handleSheets(e: React.FormEvent) {
    e.preventDefault();
    resetFeedback();
    setLoading(true);
    try {
      if (!sheetUrl.trim()) throw new Error("Cole a URL da planilha do Google Sheets.");

      const res = await fetch("/api/data-sources/google-sheets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: sheetUrl.trim(), name: name.trim() || undefined }),
      });
      const body = (await res.json().catch(() => ({}))) as IngestResponse;
      if (!res.ok) throw new Error(body.error ?? "Falha ao importar a planilha.");

      applyResult(body, "Planilha do Google Sheets");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao importar a planilha");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 p-4">
      <div
        className="w-full max-w-lg rounded-xl border border-border bg-white p-6 shadow-2xl dark:bg-slate-950"
        role="dialog"
        aria-labelledby="import-dataset-title"
      >
        <h2 id="import-dataset-title" className="text-lg font-semibold">
          Importar dataset
        </h2>
        <p className="mt-1 text-sm text-slate-500">
          Conecte uma fonte ou faça upload. Os dados ficam salvos para você montar widgets depois.
        </p>

        <div className="mt-4 flex rounded-lg border border-border p-1 text-sm">
          <button
            type="button"
            onClick={() => {
              setMode("upload");
              resetFeedback();
            }}
            className={`flex-1 rounded-md px-3 py-1.5 font-medium transition-colors ${
              mode === "upload" ? "bg-indigo-600 text-white" : "text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
            }`}
          >
            Upload CSV
          </button>
          <button
            type="button"
            onClick={() => {
              setMode("google_sheets");
              resetFeedback();
            }}
            className={`flex-1 rounded-md px-3 py-1.5 font-medium transition-colors ${
              mode === "google_sheets"
                ? "bg-indigo-600 text-white"
                : "text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
            }`}
          >
            Google Sheets
          </button>
        </div>

        {mode === "upload" ? (
          <form className="mt-4 space-y-4" onSubmit={handleUpload}>
            <div>
              <label className="mb-1 block text-sm font-medium">Nome (opcional)</label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex.: Oportunidades 2026" />
            </div>
            <div className="rounded-lg border border-dashed border-border bg-slate-50 p-3 text-xs text-slate-600 dark:bg-slate-900 dark:text-slate-400">
              <p className="mb-2 font-medium">Arquivo CSV</p>
              <input ref={fileRef} type="file" accept=".csv" className="w-full text-sm" />
            </div>
            <FormFooter
              loading={loading}
              error={error}
              success={success}
              submitLabel="Importar CSV"
              onClose={handleClose}
            />
          </form>
        ) : (
          <form className="mt-4 space-y-4" onSubmit={handleSheets}>
            <div>
              <label className="mb-1 block text-sm font-medium">Nome (opcional)</label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex.: Funil comercial" />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">URL da planilha</label>
              <Input
                value={sheetUrl}
                onChange={(e) => setSheetUrl(e.target.value)}
                placeholder="https://docs.google.com/spreadsheets/d/..."
              />
              <p className="mt-1.5 text-[11px] text-slate-500">
                A planilha precisa estar compartilhada como <strong>“Qualquer pessoa com o link”</strong> (Leitor).
              </p>
            </div>
            <FormFooter
              loading={loading}
              error={error}
              success={success}
              submitLabel="Importar planilha"
              onClose={handleClose}
            />
          </form>
        )}

        {preview ? <PreviewTable preview={preview} /> : null}
      </div>
    </div>
  );
}

function FormFooter({
  loading,
  error,
  success,
  submitLabel,
  onClose,
}: {
  loading: boolean;
  error: string | null;
  success: string | null;
  submitLabel: string;
  onClose: () => void;
}) {
  return (
    <>
      {error ? <p className="text-sm text-red-600">{error}</p> : null}
      {success ? <p className="text-sm text-emerald-700 dark:text-emerald-300">{success}</p> : null}
      <div className="flex justify-end gap-2 pt-1">
        <Button type="button" variant="ghost" onClick={onClose} disabled={loading}>
          Fechar
        </Button>
        <Button type="submit" disabled={loading}>
          {loading ? "Importando…" : submitLabel}
        </Button>
      </div>
    </>
  );
}

function PreviewTable({ preview }: { preview: DataSourcePreview }) {
  if (!preview.columns.length) return null;
  return (
    <div className="mt-4 border-t border-border pt-3">
      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
        Pré-visualização ({preview.rowCount} linhas)
      </p>
      <div className="max-h-48 overflow-auto rounded-lg border border-border">
        <table className="w-full text-left text-[11px]">
          <thead className="sticky top-0 bg-slate-100 dark:bg-slate-900">
            <tr>
              {preview.columns.map((c) => (
                <th key={c} className="whitespace-nowrap px-2 py-1 font-medium text-slate-600 dark:text-slate-300">
                  {c}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {preview.rows.map((row, i) => (
              <tr key={i} className="border-t border-border">
                {preview.columns.map((c) => (
                  <td key={c} className="whitespace-nowrap px-2 py-1 text-slate-500">
                    {row[c] ?? "—"}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
