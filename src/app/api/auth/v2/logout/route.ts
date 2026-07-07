import { NextResponse } from "next/server";
import { logoutUser } from "@/services/auth-v2.service";

export async function POST() {
  await logoutUser();
  return NextResponse.json({ ok: true });
}
