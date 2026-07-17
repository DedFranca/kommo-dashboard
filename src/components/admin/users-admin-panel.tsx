"use client";

import { useCallback, useEffect, useState } from "react";
import { RoleBadge } from "@/components/auth/role-badge";
import { Button } from "@/components/ui/button";
import { ROLE_LABELS, type UserRole } from "@/types/user-role";
import { USER_STATUS_LABELS, type UserStatus } from "@/types/user-account";
import type { AdminIntegrationOption, AdminUserSummary } from "@/types/user-account";

const ASSIGNABLE_ROLES: UserRole[] = ["EDITOR", "VIEWER"];

export function UsersAdminPanel({ currentUserId }: { currentUserId: string }) {
  const [users, setUsers] = useState<AdminUserSummary[]>([]);
  const [integrations, setIntegrations] = useState<AdminIntegrationOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const [usersRes, intRes] = await Promise.all([
      fetch("/api/admin/users"),
      fetch("/api/admin/integrations"),
    ]);
    if (!usersRes.ok) {
      setError("Não foi possível carregar usuários.");
      setLoading(false);
      return;
    }
    const usersData = (await usersRes.json()) as { users: AdminUserSummary[] };
    setUsers(usersData.users);
    if (intRes.ok) {
      const intData = (await intRes.json()) as { integrations: AdminIntegrationOption[] };
      setIntegrations(intData.integrations);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function patchUser(id: string, patch: Record<string, unknown>) {
    setBusyId(id);
    const res = await fetch(`/api/admin/users/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    });
    setBusyId(null);
    if (!res.ok) {
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      setError(data.error ?? "Falha ao atualizar usuário.");
      return;
    }
    setError(null);
    await load();
  }

  async function removeUser(id: string) {
    if (!confirm("Excluir esta conta permanentemente?")) return;
    setBusyId(id);
    const res = await fetch(`/api/admin/users/${id}`, { method: "DELETE" });
    setBusyId(null);
    if (!res.ok) {
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      setError(data.error ?? "Falha ao excluir usuário.");
      return;
    }
    setError(null);
    await load();
  }

  if (loading) return <p className="text-sm text-slate-500">Carregando usuários…</p>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Button type="button" variant="primary" onClick={() => setShowCreate((v) => !v)}>
          {showCreate ? "Fechar" : "Nova conta"}
        </Button>
        {error ? <p className="text-sm text-red-600 dark:text-red-400">{error}</p> : null}
      </div>

      {showCreate ? (
        <CreateUserForm
          integrations={integrations}
          onCreated={() => {
            setShowCreate(false);
            void load();
          }}
          onError={setError}
        />
      ) : null}

      <div className="overflow-x-auto rounded-xl border border-border bg-white shadow-sm dark:bg-slate-950/80">
        <table className="min-w-full text-left text-sm">
          <thead className="border-b border-border bg-slate-50 dark:bg-slate-900/60">
            <tr>
              <th className="px-4 py-3 font-medium">Usuário</th>
              <th className="px-4 py-3 font-medium">Papel</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">Integração Kommo</th>
              <th className="px-4 py-3 font-medium">Ações</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => {
              const isSelf = user.id === currentUserId;
              const disabled = busyId === user.id;
              return (
                <tr key={user.id} className="border-b border-border align-top last:border-0">
                  <td className="px-4 py-3">
                    <div className="font-medium">{user.name ?? "—"}</div>
                    <div className="text-xs text-slate-500">{user.email}</div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-col gap-1">
                      <RoleBadge role={user.role} />
                      {!isSelf ? (
                        <select
                          className="rounded-md border border-border bg-transparent px-2 py-1 text-xs"
                          value={user.role}
                          disabled={disabled}
                          onChange={(e) => patchUser(user.id, { role: e.target.value })}
                        >
                          {(["ADMIN", ...ASSIGNABLE_ROLES] as UserRole[]).map((r) => (
                            <option key={r} value={r}>
                              {ROLE_LABELS[r]}
                            </option>
                          ))}
                        </select>
                      ) : null}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={
                        user.status === "ACTIVE"
                          ? "inline-flex rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300"
                          : "inline-flex rounded-full bg-slate-200 px-2 py-0.5 text-xs font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-300"
                      }
                    >
                      {USER_STATUS_LABELS[user.status]}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <select
                      className="rounded-md border border-border bg-transparent px-2 py-1 text-xs"
                      value={user.kommoIntegrationId ?? ""}
                      disabled={disabled}
                      onChange={(e) =>
                        patchUser(user.id, { kommoIntegrationId: e.target.value || null })
                      }
                    >
                      <option value="">Sem integração</option>
                      {integrations.map((i) => (
                        <option key={i.id} value={i.id}>
                          {i.name} ({i.subdomain})
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-2">
                      {!isSelf ? (
                        <Button
                          type="button"
                          variant="outline"
                          className="text-xs"
                          disabled={disabled}
                          onClick={() =>
                            patchUser(user.id, {
                              status: user.status === "ACTIVE" ? "DISABLED" : "ACTIVE",
                            })
                          }
                        >
                          {user.status === "ACTIVE" ? "Desativar" : "Ativar"}
                        </Button>
                      ) : null}
                      {!isSelf ? (
                        <Button
                          type="button"
                          variant="outline"
                          className="text-xs text-red-600"
                          disabled={disabled}
                          onClick={() => removeUser(user.id)}
                        >
                          Excluir
                        </Button>
                      ) : (
                        <span className="text-xs text-slate-400">Você</span>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function CreateUserForm({
  integrations,
  onCreated,
  onError,
}: {
  integrations: AdminIntegrationOption[];
  onCreated: () => void;
  onError: (msg: string | null) => void;
}) {
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<UserRole>("VIEWER");
  const [integrationId, setIntegrationId] = useState("");
  const [saving, setSaving] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!integrationId) {
      onError("Selecione uma integração Kommo para esta conta.");
      return;
    }
    setSaving(true);
    onError(null);
    const res = await fetch("/api/admin/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email,
        name: name || undefined,
        password,
        role,
        kommoIntegrationId: integrationId,
      }),
    });
    setSaving(false);
    if (!res.ok) {
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      onError(data.error ?? "Falha ao criar conta.");
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
        <span className="mb-1 block text-xs font-medium text-slate-500">E-mail</span>
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full rounded-md border border-border bg-transparent px-3 py-2"
        />
      </label>
      <label className="text-sm">
        <span className="mb-1 block text-xs font-medium text-slate-500">Nome</span>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full rounded-md border border-border bg-transparent px-3 py-2"
        />
      </label>
      <label className="text-sm">
        <span className="mb-1 block text-xs font-medium text-slate-500">Senha</span>
        <input
          type="password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full rounded-md border border-border bg-transparent px-3 py-2"
          placeholder="Mín. 8 caracteres, letra e número"
        />
      </label>
      <label className="text-sm">
        <span className="mb-1 block text-xs font-medium text-slate-500">Papel</span>
        <select
          value={role}
          onChange={(e) => setRole(e.target.value as UserRole)}
          className="w-full rounded-md border border-border bg-transparent px-3 py-2"
        >
          {ASSIGNABLE_ROLES.map((r) => (
            <option key={r} value={r}>
              {ROLE_LABELS[r]}
            </option>
          ))}
        </select>
      </label>
      <label className="text-sm sm:col-span-2">
        <span className="mb-1 block text-xs font-medium text-slate-500">
          Integração Kommo (obrigatória para Dashboard e Analytics)
        </span>
        <select
          required
          value={integrationId}
          onChange={(e) => setIntegrationId(e.target.value)}
          className="w-full rounded-md border border-border bg-transparent px-3 py-2"
        >
          <option value="">Selecione uma integração</option>
          {integrations.map((i) => (
            <option key={i.id} value={i.id}>
              {i.name} ({i.subdomain})
            </option>
          ))}
        </select>
        {integrations.length === 0 ? (
          <span className="mt-1 block text-xs text-amber-600 dark:text-amber-400">
            Cadastre uma integração Kommo abaixo antes de criar a conta.
          </span>
        ) : null}
      </label>
      <div className="sm:col-span-2">
        <Button type="submit" variant="primary" disabled={saving}>
          {saving ? "Criando…" : "Criar conta"}
        </Button>
      </div>
    </form>
  );
}
