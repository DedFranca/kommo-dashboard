"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BarChart3, LayoutDashboard, Shield } from "lucide-react";
import { cn } from "@/lib/utils";
import { useSessionInfo } from "@/hooks/use-session-info";
import { userRoleFromAuthSession } from "@/lib/auth/roles";

type NavItem = {
  href: string;
  label: string;
  icon: typeof LayoutDashboard;
};

export function SidebarNav({ collapsed = false }: { collapsed?: boolean }) {
  const pathname = usePathname();
  const { session } = useSessionInfo();
  const role = session ? userRoleFromAuthSession(session) : "VIEWER";

  const items: NavItem[] = [
    { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { href: "/analytics", label: "Analytics", icon: BarChart3 },
  ];

  if (role === "ADMIN") {
    items.push({ href: "/dashboard/admin/users", label: "Usuários", icon: Shield });
  }

  return (
    <nav className="flex flex-1 flex-col gap-1 px-3 py-4">
      {items.map((item) => {
        const isActive =
          item.href === "/dashboard"
            ? pathname === "/dashboard" || pathname === "/dashboard/"
            : pathname === item.href || pathname.startsWith(`${item.href}/`);

        return (
          <Link
            key={item.href}
            href={item.href}
            title={item.label}
            className={cn(
              "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all",
              isActive
                ? "bg-[#2563eb] text-white shadow-lg shadow-blue-900/30"
                : "text-slate-300 hover:bg-white/10 hover:text-white",
            )}
          >
            <item.icon className={cn("h-5 w-5 shrink-0", collapsed && "mx-auto")} strokeWidth={2} />
            <span className={cn(collapsed && "sr-only")}>{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
