/**
 * Diagnóstico da integração Kommo da sessão — distingue “sem vínculo” de “token ilegível”.
 */

export type KommoSessionIssueCode =
  | "NOT_ASSIGNED"
  | "INTEGRATION_MISSING"
  | "DECRYPT_FAILED"
  | "CONNECTION_FAILED";

export const KOMMO_MSG = {
  NOT_ASSIGNED:
    "Nenhuma integração Kommo vinculada a esta conta. Peça a um administrador para atribuir uma em Usuários.",
  INTEGRATION_MISSING:
    "A integração vinculada a esta conta foi removida. Peça a um administrador para atribuir outra em Usuários.",
  DECRYPT_FAILED:
    "A integração está vinculada, mas o token não pôde ser lido. Defina a mesma APP_ENCRYPTION_KEY em todos os ambientes e recadastre o access token da integração.",
  CONNECTION_FAILED: "Não foi possível conectar à API Kommo com o token desta integração.",
} as const;

export function messageForKommoIssue(code: KommoSessionIssueCode, detail?: string): string {
  const base = KOMMO_MSG[code];
  if (detail && code === "CONNECTION_FAILED") return `${base} ${detail}`;
  return base;
}
