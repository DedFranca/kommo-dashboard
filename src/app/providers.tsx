"use client";

import { CssHealthMonitor } from "@/components/layout/css-health-monitor";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <>
      <CssHealthMonitor />
      {children}
    </>
  );
}
