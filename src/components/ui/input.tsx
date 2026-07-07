import { cn } from "@/lib/utils";
import type { InputHTMLAttributes } from "react";

export function Input({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cn(
        "w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm outline-none ring-indigo-500/30 placeholder:text-slate-400 focus:ring-2 dark:bg-slate-900",
        className,
      )}
      {...props}
    />
  );
}
