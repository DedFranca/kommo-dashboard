import { cn } from "@/lib/utils";
import type { ButtonHTMLAttributes } from "react";

export function Button({
  className,
  variant = "primary",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "ghost" | "outline" }) {
  const variants = {
    primary:
      "bg-indigo-600 text-white hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-600",
    ghost: "bg-transparent hover:bg-slate-100 dark:hover:bg-slate-800",
    outline: "border border-border bg-surface hover:bg-surface-muted",
  } as const;

  return (
    <button
      className={cn(
        "inline-flex items-center justify-center rounded-lg px-4 py-2 text-sm font-medium transition-colors disabled:opacity-50 whitespace-nowrap",
        variants[variant],
        className,
      )}
      {...props}
    />
  );
}
