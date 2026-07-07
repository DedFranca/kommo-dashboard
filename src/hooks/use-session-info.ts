"use client";

import { useEffect, useState } from "react";
import type { AuthSessionPayload } from "@/types/tenant";

/** Carrega a sessão atual (JWT v2) no cliente via /api/auth/v2/me. */
export function useSessionInfo() {
  const [session, setSession] = useState<AuthSessionPayload | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    fetch("/api/auth/v2/me")
      .then((r) => (r.ok ? r.json() : null))
      .then((d: { session?: AuthSessionPayload } | null) => {
        if (active) setSession(d?.session ?? null);
      })
      .catch(() => {
        if (active) setSession(null);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  return { session, loading };
}

export async function logoutClient() {
  await fetch("/api/auth/v2/logout", { method: "POST" }).catch(() => {});
  window.location.href = "/login";
}
