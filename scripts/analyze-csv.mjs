import fs from "node:fs";

const CSV_PATH = process.argv[2] ?? "c:\\Users\\ded32\\Downloads\\Dr. Ivan - Dados - Dados.csv";
const WON_IDS = new Set([142]);
const LOST_IDS = new Set([143]);

function parseCsvLine(line) {
  const out = [];
  let cur = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      inQuotes = !inQuotes;
      continue;
    }
    if (ch === "," && !inQuotes) {
      out.push(cur);
      cur = "";
      continue;
    }
    cur += ch;
  }
  out.push(cur);
  return out;
}

function parseBrDate(value) {
  if (!value?.trim()) return null;
  const m = /^(\d{1,2})\/(\d{1,2})\/(\d{4}),?\s*(\d{1,2}):(\d{2}):(\d{2})$/.exec(value.trim());
  if (!m) return null;
  const [, dd, mm, yyyy, hh, min, ss] = m;
  const d = new Date(Number(yyyy), Number(mm) - 1, Number(dd), Number(hh), Number(min), Number(ss));
  return Number.isNaN(d.getTime()) ? null : d;
}

function startOfDay(d) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function endOfDay(d) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999);
}

function inRange(date, from, to) {
  if (!date) return false;
  const t = startOfDay(date).getTime();
  return t >= startOfDay(from).getTime() && t <= endOfDay(to).getTime();
}

function parseCsv(text) {
  const lines = text.split(/\r?\n/).filter(Boolean);
  const headers = parseCsvLine(lines[0]);
  const rows = [];
  for (let i = 1; i < lines.length; i++) {
    const cols = parseCsvLine(lines[i]);
    const row = {};
    for (let j = 0; j < headers.length; j++) row[headers[j]] = cols[j] ?? "";
    rows.push(row);
  }
  return rows;
}

function dedupe(rows) {
  const byId = new Map();
  for (const row of rows) {
    const id = String(row.ID ?? "").trim();
    if (!/^\d+$/.test(id)) continue;
    const existing = byId.get(id);
    const ms = parseBrDate(row.Data_Atualizacao)?.getTime() ?? 0;
    const existingMs = existing ? parseBrDate(existing.Data_Atualizacao)?.getTime() ?? 0 : -1;
    if (!existing || ms >= existingMs) byId.set(id, row);
  }
  return Array.from(byId.values());
}

function countKpis(leads, from, to) {
  const inRangeCreated = leads.filter((l) => inRange(parseBrDate(l.Data_Criacao), from, to));
  const total = inRangeCreated.length;
  const cohortWonClosed = inRangeCreated.filter(
    (l) => WON_IDS.has(Number(l.Status_ID)) && inRange(parseBrDate(l.Data_Fechamento), from, to),
  ).length;
  const wonClosed = leads.filter(
    (l) => WON_IDS.has(Number(l.Status_ID)) && inRange(parseBrDate(l.Data_Fechamento), from, to),
  ).length;
  const lost = inRangeCreated.filter((l) => LOST_IDS.has(Number(l.Status_ID))).length;
  const conversion = total > 0 ? Math.round((cohortWonClosed / total) * 10000) / 100 : 0;
  return {
    total,
    wonInRange: cohortWonClosed,
    wonClosed,
    won: wonClosed,
    lost,
    conversion,
    inProgress: Math.max(0, total - cohortWonClosed - lost),
  };
}

const raw = fs.readFileSync(CSV_PATH, "utf8");
const allRows = parseCsv(raw);
const unique = dedupe(allRows);

const createdDates = unique.map((l) => parseBrDate(l.Data_Criacao)).filter(Boolean);
createdDates.sort((a, b) => a - b);

console.log("CSV rows:", allRows.length, "| unique IDs:", unique.length);
console.log("Data_Criacao:", createdDates[0]?.toISOString().slice(0, 10), "->", createdDates.at(-1)?.toISOString().slice(0, 10));

for (const label of ["2025-09", "2025-10", "2025-11", "2026-05", "2026-06"]) {
  const [y, m] = label.split("-").map(Number);
  const from = new Date(y, m - 1, 1);
  const to = new Date(y, m, 0);
  const k = countKpis(unique, from, to);
  console.log(`${label}: total=${k.total} wonClosed=${k.wonClosed} wonInCohort=${k.wonInRange} lost=${k.lost} conv=${k.conversion}%`);
}

console.log("\n--- Jan-Jun 2026 (H1) ---");
const h1From = new Date(2026, 0, 1);
const h1To = new Date(2026, 5, 30);
const h1 = countKpis(unique, h1From, h1To);
console.log(h1);
for (let m = 0; m < 6; m++) {
  const mf = new Date(2026, m, 1);
  const mt = new Date(2026, m + 1, 0);
  const mk = countKpis(unique, mf, mt);
  console.log(`2026-${String(m + 1).padStart(2, "0")}: leads=${mk.total} consultas=${mk.won} cohortWon=${mk.wonInRange ?? "n/a"}`);
}

const jFrom = new Date(2026, 5, 1);
const jTo = new Date(2026, 5, 30);
const createdJune = unique.filter((r) => inRange(parseBrDate(r.Data_Criacao), jFrom, jTo));
const wonClosedJune = unique.filter((r) => r.Status_ID === "142" && inRange(parseBrDate(r.Data_Fechamento), jFrom, jTo));
const cohortWonClosed = createdJune.filter(
  (r) => r.Status_ID === "142" && inRange(parseBrDate(r.Data_Fechamento), jFrom, jTo),
);
const lostByStatus = createdJune.filter((r) => r.Status_ID === "143").length;
const lostByReason = createdJune.filter((r) => r.Loss_Reason_ID && Number(r.Loss_Reason_ID) > 0).length;
console.log("\nJune/2026 detail:");
console.log({
  created: createdJune.length,
  wonClosedAnyCohort: wonClosedJune.length,
  cohortWonClosed: cohortWonClosed.length,
  wonStatusNow: createdJune.filter((r) => r.Status_ID === "142").length,
  lostStatus143: lostByStatus,
  lostByReasonField: lostByReason,
  impliedInProgress: createdJune.length - createdJune.filter((r) => r.Status_ID === "142").length - lostByReason,
});
