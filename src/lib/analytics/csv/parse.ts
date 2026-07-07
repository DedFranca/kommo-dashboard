import type { RawTable } from "@/types/analytics";

type ParseCsvOptions = {
  delimiter?: "," | ";";
  maxRows?: number;
};

function detectDelimiter(sampleLine: string): "," | ";" {
  const commas = (sampleLine.match(/,/g) ?? []).length;
  const semis = (sampleLine.match(/;/g) ?? []).length;
  return semis > commas ? ";" : ",";
}

function splitCsvLine(line: string, delimiter: string): string[] {
  const parts: string[] = [];
  let cur = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === '"') {
      // handle escaped double quote
      const next = line[i + 1];
      if (inQuotes && next === '"') {
        cur += '"';
        i++;
        continue;
      }
      inQuotes = !inQuotes;
      continue;
    }
    if (!inQuotes && c === delimiter) {
      parts.push(cur.trim());
      cur = "";
      continue;
    }
    cur += c;
  }
  parts.push(cur.trim());
  return parts;
}

function normalizeHeader(h: string, idx: number) {
  const cleaned = h.replace(/^\uFEFF/, "").trim();
  return cleaned !== "" ? cleaned : `col_${idx + 1}`;
}

export function parseCsvToRawTable(text: string, opts: ParseCsvOptions = {}): RawTable {
  const lines = text
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .split("\n")
    .filter((l) => l.trim() !== "");

  if (!lines.length) return { columns: [], rows: [] };

  const delimiter = opts.delimiter ?? detectDelimiter(lines[0] ?? "");
  const maxRows = opts.maxRows ?? 50_000;

  const headerCells = splitCsvLine(lines[0] ?? "", delimiter);
  const columns = headerCells.map((h, idx) => normalizeHeader(h, idx));

  const rows: Record<string, string | null>[] = [];
  for (let i = 1; i < lines.length && rows.length < maxRows; i++) {
    const cells = splitCsvLine(lines[i] ?? "", delimiter);
    const row: Record<string, string | null> = {};
    for (let c = 0; c < columns.length; c++) {
      const raw = cells[c];
      const v = raw === undefined ? null : raw.trim();
      row[columns[c]!] = v === "" ? null : v;
    }
    rows.push(row);
  }

  return { columns, rows };
}

