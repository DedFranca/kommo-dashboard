import { createCipheriv, createDecipheriv, createHash, randomBytes } from "crypto";

const ALGO = "aes-256-gcm";
const IV_LEN = 12;
const INSECURE_FALLBACK = "dev-insecure-key-change-me";

function resolveEncryptionSecret(): { secret: string; source: "APP_ENCRYPTION_KEY" | "AUTH_SECRET" | "insecure_fallback" } {
  const appKey = process.env.APP_ENCRYPTION_KEY?.trim();
  if (appKey) return { secret: appKey, source: "APP_ENCRYPTION_KEY" };
  const auth = process.env.AUTH_SECRET?.trim() || process.env.JWT_SECRET?.trim();
  if (auth) return { secret: auth, source: "AUTH_SECRET" };
  return { secret: INSECURE_FALLBACK, source: "insecure_fallback" };
}

function deriveKey(): Buffer {
  return createHash("sha256").update(resolveEncryptionSecret().secret).digest();
}

/** True se há chave explícita (APP_ENCRYPTION_KEY ou AUTH_SECRET). */
export function isFieldEncryptionConfigured(): boolean {
  return resolveEncryptionSecret().source !== "insecure_fallback";
}

export function getFieldEncryptionSource(): "APP_ENCRYPTION_KEY" | "AUTH_SECRET" | "insecure_fallback" {
  return resolveEncryptionSecret().source;
}

/**
 * Em produção, exige APP_ENCRYPTION_KEY ou AUTH_SECRET.
 * Sem isso, tokens Kommo quebram entre deploys/dispositivos.
 */
export function assertFieldEncryptionReady(): { ok: true } | { ok: false; error: string } {
  if (isFieldEncryptionConfigured()) return { ok: true };
  if (process.env.NODE_ENV === "production") {
    return {
      ok: false,
      error:
        "Defina APP_ENCRYPTION_KEY (recomendado) ou AUTH_SECRET no servidor. Sem isso os tokens Kommo não funcionam de forma estável.",
    };
  }
  return { ok: true };
}

export function encryptField(plain: string): string {
  const key = deriveKey();
  const iv = randomBytes(IV_LEN);
  const cipher = createCipheriv(ALGO, key, iv);
  const enc = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${iv.toString("base64")}:${tag.toString("base64")}:${enc.toString("base64")}`;
}

export function decryptField(payload: string): string {
  const [ivB64, tagB64, dataB64] = payload.split(":");
  if (!ivB64 || !tagB64 || !dataB64) throw new Error("Campo criptografado inválido");
  const key = deriveKey();
  const decipher = createDecipheriv(ALGO, key, Buffer.from(ivB64, "base64"));
  decipher.setAuthTag(Buffer.from(tagB64, "base64"));
  const dec = Buffer.concat([decipher.update(Buffer.from(dataB64, "base64")), decipher.final()]);
  return dec.toString("utf8");
}

/** Confirma que a chave atual consegue abrir o que acabou de ser cifrado. */
export function assertEncryptRoundTrip(plain: string): void {
  const encrypted = encryptField(plain);
  const decrypted = decryptField(encrypted);
  if (decrypted !== plain) {
    throw new Error("Falha no round-trip de criptografia (APP_ENCRYPTION_KEY inconsistente).");
  }
}
