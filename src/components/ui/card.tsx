import { cn } from "@/lib/utils";
import type { HTMLAttributes } from "react";

export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "rounded-xl border border-border bg-surface-muted/80 p-4 shadow-sm backdrop-blur-sm dark:bg-slate-900/60",
        className,
      )}
      {...props}
    />
  );
}
