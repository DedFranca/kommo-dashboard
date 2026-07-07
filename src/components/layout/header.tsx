"use client";

import { RoleBadge } from "@/components/auth/role-badge";
import { Button } from "@/components/ui/button";
import { logoutClient, useSessionInfo } from "@/hooks/use-session-info";
import { userRoleFromAuthSession } from "@/lib/auth/roles";

export function Header({ title = "Dashboard" }: { title?: string }) {
  const { session } = useSessionInfo();
  const role = session ? userRoleFromAuthSession(session) : "VIEWER";

  return (
    <header className="flex h-14 items-center justify-between border-b border-border bg-surface/80 px-4 backdrop-blur sm:px-6">
      <h1 className="text-lg font-semibold tracking-tight">{title}</h1>
      <div className="flex items-center gap-2 sm:gap-3">
        <RoleBadge role={role} className="hidden sm:inline-flex" />
        <span className="hidden max-w-[160px] truncate text-sm text-slate-600 md:inline">
          {session?.name ?? session?.email}
        </span>
        <Button type="button" variant="outline" className="text-sm" onClick={() => void logoutClient()}>
          Sair
        </Button>
      </div>
    </header>
  );
}
