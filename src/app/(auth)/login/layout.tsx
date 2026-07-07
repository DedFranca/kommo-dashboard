import Link from "next/link";
import { redirect } from "next/navigation";
import { getRequestSession } from "@/lib/auth/request-session";

export default async function LoginLayout({ children }: { children: React.ReactNode }) {
  const session = await getRequestSession();
  if (session) redirect("/dashboard");

  return (
    <div className="flex min-h-dvh flex-col bg-[#eef2f7]">
      <header className="border-b border-slate-200/80 bg-white px-6 py-4 shadow-sm">
        <Link href="/" className="text-sm font-bold tracking-tight text-slate-900">
          KOMMO Dashboard
        </Link>
      </header>
      <div className="flex flex-1 items-center justify-center p-4 sm:p-8">{children}</div>
    </div>
  );
}
