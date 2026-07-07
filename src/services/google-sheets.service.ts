/**
 * Conector Google Sheets (planilhas públicas / "qualquer pessoa com o link").
 *
 * Estratégia v1: importar via URL pública exportando como CSV.
 * Evolução futura: OAuth2 / API key para planilhas privadas e sync automático.
 */

export type GoogleSheetRef = {
  sheetId: string;
  gid?: string;
};

const SHEET_ID_RE = /\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/;
const GID_RE = /[#&?]gid=([0-9]+)/;

/** Extrai o ID (e gid, se houver) de uma URL ou ID puro do Google Sheets. */
export function parseGoogleSheetRef(input: string): GoogleSheetRef | null {
  const value = input.trim();
  if (!value) return null;

  const idMatch = value.match(SHEET_ID_RE);
  const gidMatch = value.match(GID_RE);

  if (idMatch?.[1]) {
    return { sheetId: idMatch[1], gid: gidMatch?.[1] };
  }

  // Permite colar apenas o ID da planilha (sem URL).
  if (/^[a-zA-Z0-9-_]{20,}$/.test(value)) {
    return { sheetId: value, gid: gidMatch?.[1] };
  }

  return null;
}

/** Monta a URL de exportação CSV de uma planilha pública. */
export function buildGoogleSheetCsvUrl(ref: GoogleSheetRef): string {
  const base = `https://docs.google.com/spreadsheets/d/${ref.sheetId}/export?format=csv`;
  return ref.gid ? `${base}&gid=${ref.gid}` : base;
}

export type GoogleSheetCsvResult = {
  text: string;
  ref: GoogleSheetRef;
};

/**
 * Busca o CSV de uma planilha pública do Google Sheets.
 * Lança erro amigável quando a planilha é privada ou a URL é inválida.
 */
export async function fetchGoogleSheetCsv(input: string): Promise<GoogleSheetCsvResult> {
  const ref = parseGoogleSheetRef(input);
  if (!ref) {
    throw new Error("URL ou ID do Google Sheets inválido. Cole o link completo da planilha.");
  }

  const url = buildGoogleSheetCsvUrl(ref);

  let res: Response;
  try {
    res = await fetch(url, { redirect: "follow", cache: "no-store" });
  } catch {
    throw new Error("Não foi possível acessar o Google Sheets. Verifique sua conexão.");
  }

  if (res.status === 401 || res.status === 403) {
    throw new Error(
      "A planilha não é pública. Em 'Compartilhar', selecione 'Qualquer pessoa com o link' como Leitor.",
    );
  }
  if (!res.ok) {
    throw new Error(`Falha ao importar a planilha (HTTP ${res.status}).`);
  }

  const contentType = res.headers.get("content-type") ?? "";
  const text = await res.text();

  // Quando a planilha é privada, o Google responde com uma página HTML de login.
  if (contentType.includes("text/html") || text.trimStart().startsWith("<!DOCTYPE")) {
    throw new Error(
      "A planilha não é pública. Em 'Compartilhar', selecione 'Qualquer pessoa com o link' como Leitor.",
    );
  }

  if (!text.trim()) {
    throw new Error("A planilha está vazia ou a aba selecionada não tem dados.");
  }

  return { text, ref };
}
