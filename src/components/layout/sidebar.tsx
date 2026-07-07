"use client";

import { ChevronDown, Hexagon } from "lucide-react";
import { SidebarNav } from "@/components/layout/sidebar-nav";
import { cn } from "@/lib/utils";
import { logoutClient, useSessionInfo } from "@/hooks/use-session-info";
import { userRoleFromAuthSession } from "@/lib/auth/roles";
import { ROLE_LABELS } from "@/types/user-role";

type Props = {
  className?: string;
  collapsed?: boolean;
  onToggleCollapsed?: () => void;
  onCloseMobile?: () => void;
};

export function Sidebar({ className, collapsed = false, onToggleCollapsed, onCloseMobile }: Props) {
  const { session } = useSessionInfo();
  const name = session?.name ?? session?.email ?? "Usuário";
  const roleLabel = session ? ROLE_LABELS[userRoleFromAuthSession(session)] : "";

  return (
    <aside
      className={cn(
        "flex shrink-0 flex-col bg-gradient-to-b from-[#0f2744] via-[#0c2340] to-[#081a30] text-white",
        collapsed ? "w-[72px]" : "w-64",
        className,
      )}
    >
      <div className={cn("flex items-center gap-2 border-b border-white/10 px-4 py-5", collapsed && "justify-center px-2")}>
        <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-500/20">
          <Hexagon className="h-5 w-5 text-emerald-400" fill="currentColor" fillOpacity={0.2} />
        </span>
        {!collapsed ? (
          <span className="text-lg font-bold tracking-wide text-white">KOMMO</span>
        ) : null}
      </div>

      <SidebarNav collapsed={collapsed} />

      <div className="mt-auto border-t border-white/10 p-3">
        <button
          type="button"
          className={cn(
            "flex w-full items-center gap-3 rounded-xl px-2 py-2 text-left transition-colors hover:bg-white/10",
            collapsed && "justify-center",
          )}
          onClick={() => {
            void logoutClient();
          }}
        >
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-blue-500 text-xs font-bold">
            {name.charAt(0).toUpperCase()}
          </span>
          {!collapsed ? (
            <>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold">{name}</p>
                <p className="text-xs text-slate-400">{roleLabel}</p>
              </div>
              <ChevronDown className="h-4 w-4 text-slate-400" />
            </>
          ) : null}
        </button>
      </div>

      {onToggleCollapsed ? (
        <button
          type="button"
          className="hidden border-t border-white/10 py-2 text-center text-xs text-slate-400 hover:text-white md:block"
          onClick={onToggleCollapsed}
        >
          {collapsed ? "»" : "« Recolher"}
        </button>
      ) : null}

      {onCloseMobile ? (
        <button type="button" className="sr-only" onClick={onCloseMobile}>
          Fechar
        </button>
      ) : null}
    </aside>
  );
}
