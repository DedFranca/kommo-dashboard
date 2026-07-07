"use client";

import { useCallback, useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";
import { cn } from "@/lib/utils";

const SIDEBAR_COLLAPSED_KEY = "dashboard-sidebar-collapsed";

export function DashboardShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isExecutiveHome =
    pathname === "/dashboard" || pathname === "/dashboard/" || pathname.startsWith("/analytics");
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const persisted = window.localStorage.getItem(SIDEBAR_COLLAPSED_KEY);
    setCollapsed(persisted === "true");
  }, []);

  const toggleCollapsed = useCallback(() => {
    setCollapsed((current) => {
      const next = !current;
      window.localStorage.setItem(SIDEBAR_COLLAPSED_KEY, String(next));
      return next;
    });
  }, []);

  return (
    <div className="flex min-h-dvh bg-[#eef2f7]">
      <Sidebar
        collapsed={collapsed}
        onToggleCollapsed={toggleCollapsed}
        className="hidden md:flex"
      />

      {mobileOpen ? (
        <>
          <button
            type="button"
            className="fixed inset-0 z-40 bg-slate-900/50 md:hidden"
            aria-label="Fechar menu"
            onClick={() => setMobileOpen(false)}
          />
          <Sidebar
            collapsed={false}
            onCloseMobile={() => setMobileOpen(false)}
            className="fixed inset-y-0 left-0 z-50 md:hidden"
          />
        </>
      ) : null}

      <div className="flex min-w-0 flex-1 flex-col">
        {!isExecutiveHome ? <Header /> : null}
        <main className={cn("flex-1 overflow-auto", isExecutiveHome ? "p-0" : "p-4 md:p-6")}>
          {isExecutiveHome ? (
            <div data-mobile-menu-handler className="contents">
              {/* handler injected via context in page — see dashboard-page-client */}
              {children}
            </div>
          ) : (
            children
          )}
        </main>
      </div>
    </div>
  );
}
