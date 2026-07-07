"use client";

import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import type { AdminIntegrationOption } from "@/types/user-account";

export function IntegrationsAdminSection() {
  const [integrations, setIntegrations] = useState<AdminIntegrationOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/admin/integrations");
    if (res.ok) {
      const data = (await res.json()) as { integrations: AdminIntegrationOption[] };
      setIntegrations(data.integrations);
    } else {
      setError("Não foi possível carregar integrações.");
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-base font-semibold">Integrações Kommo</h3>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            Cadastre integrações para vincular a contas de Visualizador.
          </p>
        </div>
        <Button type="button" variant="primary" onClick={() => setShowForm((v) => !v)}>
          {showForm ? "Fechar" : "Nova integração"}
        </Button>
      </div>

      {error ? <p className="text-sm text-red-600 dark:text-red-400">{error}</p> : null}

      {showForm ? (
        <CreateIntegrationForm
          onCreated={() => {
            setShowForm(false);
            void load();
          }}
          onError={setError}
        />
      ) : null}

      {loading ? (
        <p className="text-sm text-slate-500">Carregando…</p>
      ) : integrations.length === 0 ? (
        <p className="rounded-lg border border-dashed border-border p-4 text-sm text-slate-500">
          Nenhuma integração cadastrada.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border bg-white shadow-sm dark:bg-slate-950/80">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-border bg-slate-50 dark:bg-slate-900/60">
              <tr>
                <th className="px-4 py-3 font-medium">Nome</th>
                <th className="px-4 py-3 font-medium">Subdomínio</th>
                <th className="px-4 py-3 font-medium">Ativa</th>
              </tr>
            </thead>
            <tbody>
              {integrations.map((i) => (
                <tr key={i.id} className="border-b border-border last:border-0">
                  <td className="px-4 py-3 font-medium">{i.name}</td>
                  <td className="px-4 py-3 text-slate-500">{i.subdomain}</td>
                  <td className="px-4 py-3">{i.isActive ? "Sim" : "Não"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

function CreateIntegrationForm({
  onCreated,
  onError,
}: {
  onCreated: () => void;
  onError: (msg: string | null) => void;
}) {
  const [name, setName] = useState("");
  const [subdomain, setSubdomain] = useState("");
  const [accessToken, setAccessToken] = useState("");
  const [saving, setSaving] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    onError(null);
    const res = await fetch("/api/admin/integrations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, subdomain, accessToken }),
    });
    setSaving(false);
    if (!res.ok) {
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      onError(data.error ?? "Falha ao criar integração.");
      return;
    }
    onCreated();
  }

  return (
    <form
      onSubmit={submit}
      className="grid gap-3 rounded-xl border border-border bg-white p-4 shadow-sm dark:bg-slate-950/80 sm:grid-cols-2"
    >
      <label className="text-sm">
        <span className="mb-1 block text-xs font-medium text-slate-500">Nome</span>
        <input
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full rounded-md border border-border bg-transparent px-3 py-2"
        />
      </label>
      <label className="text-sm">
        <span className="mb-1 block text-xs font-medium text-slate-500">Subdomínio Kommo</span>
        <input
          required
          value={subdomain}
          onChange={(e) => setSubdomain(e.target.value)}
          placeholder="ex.: minhaempresa"
          className="w-full rounded-md border border-border bg-transparent px-3 py-2"
        />
      </label>
      <label className="text-sm sm:col-span-2">
        <span className="mb-1 block text-xs font-medium text-slate-500">Access Token (longa duração)</span>
        <textarea
          required
          value={accessToken}
          onChange={(e) => setAccessToken(e.target.value)}
          rows={3}
          className="w-full rounded-md border border-border bg-transparent px-3 py-2 font-mono text-xs"
        />
      </label>
      <div className="sm:col-span-2">
        <Button type="submit" variant="primary" disabled={saving}>
          {saving ? "Salvando…" : "Criar integração"}
        </Button>
      </div>
    </form>
  );
}
