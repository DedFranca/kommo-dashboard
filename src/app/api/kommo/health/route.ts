import { NextResponse } from "next/server";
import { getRequestSession } from "@/lib/auth/request-session";
import { diagnoseKommoForSession, verifyKommoForSession } from "@/lib/kommo/session-client";
import { getFieldEncryptionSource, isFieldEncryptionConfigured } from "@/lib/crypto/field-encryption";

export async function GET() {
  const session = await getRequestSession();
  if (!session) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const diagnosis = await diagnoseKommoForSession(session);
  if (!diagnosis.ok) {
    return NextResponse.json({
      configured: false,
      ok: false,
      code: diagnosis.code,
      error: diagnosis.error,
      integrationId: diagnosis.integrationId,
      encryptionConfigured: isFieldEncryptionConfigured(),
      encryptionSource: getFieldEncryptionSource(),
    });
  }

  const health = await verifyKommoForSession(session);
  return NextResponse.json({
    configured: true,
    encryptionConfigured: isFieldEncryptionConfigured(),
    encryptionSource: getFieldEncryptionSource(),
    ...health,
  });
}
