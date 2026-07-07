import { parseBrDateTime } from "@/lib/kommo/lead-dedupe";
import { startOfDay } from "@/lib/date-range";

const KOMMO_TIMEZONE = "America/Sao_Paulo";

/** Dia de calendário no fuso do Kommo/CSV (Brasília), alinhado ao export "dd/mm/yyyy, hh:mm:ss". */
export function toKommoCalendarDate(value: unknown): Date | null {
  if (value == null || value === "") return null;

  if (typeof value === "number") {
    const ms = value < 1e12 ? value * 1000 : value;
    if (!Number.isFinite(ms)) return null;
    return calendarDateInKommoTimezone(new Date(ms));
  }

  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) return null;
    if (/^[0-9]+$/.test(trimmed)) return toKommoCalendarDate(Number(trimmed));

    const br = parseBrDateTime(trimmed);
    if (br) return startOfDay(br);

    const iso = /^(\d{4})-(\d{2})-(\d{2})/.exec(trimmed);
    if (iso) return new Date(Number(iso[1]), Number(iso[2]) - 1, Number(iso[3]));

    const parsed = new Date(trimmed);
    if (!Number.isNaN(parsed.getTime())) return calendarDateInKommoTimezone(parsed);
  }

  return null;
}

function calendarDateInKommoTimezone(instant: Date): Date {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: KOMMO_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(instant);

  const year = Number(parts.find((p) => p.type === "year")?.value);
  const month = Number(parts.find((p) => p.type === "month")?.value);
  const day = Number(parts.find((p) => p.type === "day")?.value);
  if (!Number.isFinite(year) || !Number.isFinite(month) || !Number.isFinite(day)) return startOfDay(instant);
  return new Date(year, month - 1, day);
}
