"use client";

import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type Props = {
  title: string;
  subtitle?: string;
  children: ReactNode;
  className?: string;
  action?: ReactNode;
};

export function AnalyticsSection({ title, subtitle, children, className, action }: Props) {
  return (
    <section
      className={cn(
        "rounded-2xl border border-slate-200/80 bg-white p-6 shadow-[0_8px_30px_rgba(15,23,42,0.06)]",
        className,
      )}
    >
      <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-sm font-bold uppercase tracking-wide text-slate-800">{title}</h2>
          {subtitle ? <p className="mt-1 text-sm text-slate-500">{subtitle}</p> : null}
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

export function AnalyticsSkeleton({ className }: { className?: string }) {
  return <div className={cn("animate-pulse rounded-xl bg-slate-100", className)} />;
}
