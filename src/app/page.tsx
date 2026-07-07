import { getRequestSession } from "@/lib/auth/request-session";
import { redirect } from "next/navigation";

export default async function Home() {
  const session = await getRequestSession();
  if (session) redirect("/dashboard");
  redirect("/login");
}
