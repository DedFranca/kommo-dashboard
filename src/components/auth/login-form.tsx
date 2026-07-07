"use client";

import { FormEvent, useState } from "react";
import { Hexagon, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function LoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    try {
      const params = new URLSearchParams(window.location.search);
      const callbackUrl = params.get("callbackUrl") ?? "/dashboard";

      const res = await fetch("/api/auth/v2/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim().toLowerCase(), password }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        setMessage(data.error ?? "E-mail ou senha inválidos.");
        return;
      }
      window.location.href = callbackUrl;
    } catch {
      setMessage("Não foi possível conectar. Tente novamente.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="w-full max-w-md">
      <div className="rounded-2xl border border-slate-200/80 bg-white p-8 shadow-[0_8px_30px_rgba(15,23,42,0.08)]">
        <div className="mb-6 flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-b from-[#0f2744] to-[#081a30]">
            <Hexagon className="h-6 w-6 text-emerald-400" fill="currentColor" fillOpacity={0.2} />
          </span>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-slate-900">KOMMO Dashboard</h1>
            <p className="text-sm text-slate-500">Acesse sua conta</p>
          </div>
        </div>

        <form className="space-y-4" onSubmit={onSubmit}>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700" htmlFor="email">
              E-mail
            </label>
            <Input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="rounded-lg border-slate-200"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700" htmlFor="password">
              Senha
            </label>
            <Input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="rounded-lg border-slate-200"
            />
          </div>
          {message ? <p className="text-sm text-rose-600">{message}</p> : null}
          <Button
            type="submit"
            className="w-full rounded-lg bg-[#2563eb] font-semibold hover:bg-[#1d4ed8]"
            disabled={loading}
          >
            {loading ? (
              <span className="inline-flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                Entrando…
              </span>
            ) : (
              "Entrar"
            )}
          </Button>
        </form>
      </div>
    </div>
  );
}
