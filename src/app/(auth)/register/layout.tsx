import Link from "next/link";
import { getRequestSession } from "@/lib/auth/request-session";
import { redirect } from "next/navigation";

export default async function RegisterLayout({ children }: { children: React.ReactNode }) {
  const session = await getRequestSession();
  if (session) redirect("/dashboard");

  return (
    <div className="flex min-h-dvh flex-col bg-gradient-to-b from-indigo-50 to-surface dark:from-slate-950 dark:to-slate-900">
      <header className="flex items-center justify-between px-6 py-4">
        <Link href="/" className="text-sm font-semibold text-indigo-700 dark:text-indigo-300">
          Kommo Dashboard
        </Link>
      </header>
      <div className="flex flex-1 items-center justify-center p-4">{children}</div>
    </div>
  );
}
