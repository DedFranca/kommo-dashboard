import { ROLE_LABELS, type UserRole } from "@/types/user-role";
import { cn } from "@/lib/utils";

const ROLE_STYLES: Record<UserRole, string> = {
  ADMIN: "bg-violet-100 text-violet-800 dark:bg-violet-950 dark:text-violet-200",
  EDITOR: "bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-200",
  VIEWER: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200",
};

export function RoleBadge({ role, className }: { role: UserRole; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex rounded-full px-2 py-0.5 text-xs font-medium",
        ROLE_STYLES[role],
        className,
      )}
    >
      {ROLE_LABELS[role]}
    </span>
  );
}
