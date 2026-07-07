"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

function passwordStrength(password: string): { score: number; label: string } {
  let score = 0;
  if (password.length >= 8) score++;
  if (/[A-Za-z]/.test(password)) score++;
  if (/\d/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;
  const labels = ["Muito fraca", "Fraca", "Razoável", "Boa", "Forte"];
  return { score, label: labels[score] ?? labels[0] };
}

export function RegisterForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const strength = useMemo(() => passwordStrength(password), [password]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMessage(null);
    setSuccess(false);

    const res = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email, password, confirmPassword }),
    });

    const data = (await res.json()) as { error?: string; message?: string };
    setLoading(false);

    if (!res.ok) {
      setMessage(data.error ?? "Não foi possível criar a conta.");
      return;
    }

    setSuccess(true);
    setMessage(data.message ?? "Conta criada. Redirecionando para o login…");
    setTimeout(() => router.push("/login?registered=1"), 1200);
  }

  return (
    <Card className="w-full max-w-md border-border bg-surface/90 p-6 shadow-lg dark:bg-slate-950/80">
      <h1 className="text-xl font-semibold tracking-tight">Criar conta</h1>
      <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
        Novas contas recebem acesso de <strong>Visualizador</strong>. Um administrador pode promover seu papel depois.
      </p>
      <form className="mt-6 space-y-4" onSubmit={onSubmit}>
        <div>
          <label className="mb-1 block text-sm font-medium" htmlFor="name">
            Nome (opcional)
          </label>
          <Input id="name" value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium" htmlFor="reg-email">
            E-mail
          </label>
          <Input
            id="reg-email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium" htmlFor="reg-password">
            Senha
          </label>
          <Input
            id="reg-password"
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="new-password"
          />
          {password ? (
            <p className="mt-1 text-xs text-slate-500">
              Força: {strength.label} — mínimo 8 caracteres, letra e número.
            </p>
          ) : null}
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium" htmlFor="confirm-password">
            Confirmar senha
          </label>
          <Input
            id="confirm-password"
            type="password"
            required
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            autoComplete="new-password"
          />
        </div>
        {message ? (
          <p className={`text-sm ${success ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"}`}>
            {message}
          </p>
        ) : null}
        <Button type="submit" className="w-full" disabled={loading || success}>
          {loading ? "Criando…" : "Criar conta"}
        </Button>
      </form>
      <p className="mt-4 text-center text-sm text-slate-600 dark:text-slate-400">
        Já tem conta?{" "}
        <Link href="/login" className="font-medium text-indigo-600 hover:underline dark:text-indigo-300">
          Entrar
        </Link>
      </p>
    </Card>
  );
}
