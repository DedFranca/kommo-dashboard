"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";

type ViewerAccount = { id: string; email: string; name: string | null };

export function SharePresetDialog({
  presetName,
  currentViewerIds,
  onClose,
  onShare,
}: {
  presetName: string;
  currentViewerIds: string[];
  onClose: () => void;
  onShare: (viewerIds: string[]) => Promise<void>;
}) {
  const [viewers, setViewers] = useState<ViewerAccount[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set(currentViewerIds));
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/layouts/viewers")
      .then((r) => (r.ok ? r.json() : null))
      .then((d: { viewers?: ViewerAccount[] } | null) => setViewers(d?.viewers ?? []))
      .catch(() => setViewers([]))
      .finally(() => setLoading(false));
  }, []);

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function save() {
    setSaving(true);
    setError(null);
    try {
      await onShare(Array.from(selected));
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Falha ao compartilhar.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md rounded-xl border border-border bg-white p-5 shadow-xl dark:bg-slate-950">
        <h3 className="mb-1 text-lg font-semibold">Compartilhar “{presetName}”</h3>
        <p className="mb-3 text-sm text-slate-500">
          Selecione os visualizadores que poderão ver este layout na aba Analytics deles.
        </p>
        {loading ? (
          <p className="text-sm text-slate-500">Carregando visualizadores…</p>
        ) : viewers.length === 0 ? (
          <p className="text-sm text-slate-400">Nenhum visualizador cadastrado.</p>
        ) : (
          <div className="max-h-64 space-y-1 overflow-y-auto">
            {viewers.map((v) => (
              <label
                key={v.id}
                className="flex items-center gap-2 rounded-md px-2 py-1.5 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <input type="checkbox" checked={selected.has(v.id)} onChange={() => toggle(v.id)} />
                <span className="text-sm">
                  {v.name ?? v.email}
                  <span className="ml-1 text-xs text-slate-400">{v.email}</span>
                </span>
              </label>
            ))}
          </div>
        )}
        {error ? <p className="mt-2 text-sm text-red-600">{error}</p> : null}
        <div className="mt-4 flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="button" variant="primary" disabled={saving} onClick={save}>
            {saving ? "Salvando…" : "Salvar compartilhamento"}
          </Button>
        </div>
      </div>
    </div>
  );
}
