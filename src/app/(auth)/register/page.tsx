import { redirect } from "next/navigation";

/** Registro público desabilitado — contas são criadas por administradores. */
export default function RegisterPage() {
  redirect("/login");
}
