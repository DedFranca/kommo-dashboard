"use client";

import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import type { AdminIntegrationOption } from "@/types/user-account";

export function IntegrationsAdminSection() {
  const [integrations, setIntegrations] = useState<AdminIntegrationOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [tokenEditId, setTokenEditId] = useState<string | null>(null);

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

  async function remove(id: string, name: string) {
    if (
      !confirm(
        `Excluir a integração "${name}"? Usuários vinculados ficarão sem dados Kommo até receberem outra atribuição.`,
      )
    ) {
      return;
    }
    setBusyId(id);
    setError(null);
    const res = await fetch(`/api/admin/integrations/${id}`, { method: "DELETE" });
    setBusyId(null);
    if (!res.ok) {
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      setError(data.error ?? "Falha ao excluir integração.");
      return;
    }
    await load();
  }

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h3 className="text-base font-semibold">Integrações Kommo</h3>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            Cadastre contas Kommo e vincule cada uma a usuários. Use a mesma{" "}
            <code className="text-xs">APP_ENCRYPTION_KEY</code> em local e produção — se mudar, use
            “Atualizar token” aqui.
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
                <th className="px-4 py-3 font-medium">Ações</th>
              </tr>
            </thead>
            <tbody>
              {integrations.map((i) => {
                const busy = busyId === i.id;
                return (
                  <tr key={i.id} className="border-b border-border last:border-0">
                    <td className="px-4 py-3 font-medium">{i.name}</td>
                    <td className="px-4 py-3 text-slate-500">{i.subdomain}</td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          className="text-xs"
                          disabled={busy}
                          onClick={() => setTokenEditId((cur) => (cur === i.id ? null : i.id))}
                        >
                          Atualizar token
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          className="text-xs text-red-600"
                          disabled={busy}
                          onClick={() => remove(i.id, i.name)}
                        >
                          {busy ? "…" : "Excluir"}
                        </Button>
                      </div>
                      {tokenEditId === i.id ? (
                        <UpdateTokenForm
                          integrationId={i.id}
                          onDone={() => {
                            setTokenEditId(null);
                            void load();
                          }}
                          onError={setError}
                          onBusy={setBusyId}
                        />
                      ) : null}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

function UpdateTokenForm({
  integrationId,
  onDone,
  onError,
  onBusy,
}: {
  integrationId: string;
  onDone: () => void;
  onError: (msg: string | null) => void;
  onBusy: (id: string | null) => void;
}) {
  const [accessToken, setAccessToken] = useState("");
  const [saving, setSaving] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    onBusy(integrationId);
    onError(null);
    const res = await fetch(`/api/admin/integrations/${integrationId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ accessToken }),
    });
    setSaving(false);
    onBusy(null);
    if (!res.ok) {
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      onError(data.error ?? "Falha ao atualizar token.");
      return;
    }
    onDone();
  }

  return (
    <form onSubmit={submit} className="mt-3 space-y-2 rounded-lg border border-border bg-slate-50 p-3 dark:bg-slate-900/40">
      <label className="block text-xs">
        <span className="mb-1 block font-medium text-slate-500">Novo access token</span>
        <textarea
          required
          value={accessToken}
          onChange={(e) => setAccessToken(e.target.value)}
          rows={3}
          className="w-full rounded-md border border-border bg-transparent px-3 py-2 font-mono text-xs"
        />
      </label>
      <Button type="submit" variant="primary" className="text-xs" disabled={saving}>
        {saving ? "Validando…" : "Salvar token"}
      </Button>
    </form>
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
      <p className="text-xs text-slate-500 sm:col-span-2">
        O token é validado na Kommo e cifado com <code>APP_ENCRYPTION_KEY</code>. Se você ainda não
        tiver integração vinculada, esta conta de admin é associada automaticamente.
      </p>
      <div className="sm:col-span-2">
        <Button type="submit" variant="primary" disabled={saving}>
          {saving ? "Validando e salvando…" : "Criar integração"}
        </Button>
      </div>
    </form>
  );
}
