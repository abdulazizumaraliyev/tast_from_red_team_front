const UZ_MONTHS = [
  "yanvar",
  "fevral",
  "mart",
  "aprel",
  "may",
  "iyun",
  "iyul",
  "avgust",
  "sentabr",
  "oktabr",
  "noyabr",
  "dekabr",
];

const UZ_MONTHS_SHORT = [
  "yan",
  "fev",
  "mar",
  "apr",
  "may",
  "iyn",
  "iyl",
  "avg",
  "sen",
  "okt",
  "noy",
  "dek",
];

export function fmt(value: number | null | undefined): string {
  if (value === null || value === undefined || Number.isNaN(value)) return "—";
  return Math.round(value)
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

export function pct(value: number | null | undefined, digits = 1): string {
  if (value === null || value === undefined || Number.isNaN(value)) return "—";
  return `${(value * 100).toFixed(digits)}%`;
}

export function ratio(value: number | null | undefined, total: number): number {
  if (!total) return 0;
  return (value ?? 0) / total;
}

/** Backend ISO beradi (`2025-06-14T07:07:06`), ba'zi eski yozuvlarda bo'sh joy bilan. */
export function parseDate(value: string | null | undefined): Date | null {
  if (!value) return null;
  const normalized = value.includes("T") ? value : value.replace(" ", "T");
  const date = new Date(normalized);
  return Number.isNaN(date.getTime()) ? null : date;
}

function pad(value: number): string {
  return value < 10 ? `0${value}` : String(value);
}

export function dateShort(value: string | null | undefined): string {
  const date = parseDate(value);
  if (!date) return "—";
  return `${pad(date.getDate())}-${UZ_MONTHS_SHORT[date.getMonth()]}, ${date.getFullYear()}`;
}

export function dateTime(value: string | null | undefined): string {
  const date = parseDate(value);
  if (!date) return "—";
  return `${dateShort(value)} · ${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function timeOnly(value: string | null | undefined): string {
  const date = parseDate(value);
  if (!date) return "—";
  return `${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
}

export function monthLabel(month: string): string {
  const [year, index] = month.split("-");
  const name = UZ_MONTHS_SHORT[Number(index) - 1] ?? month;
  return `${name} ${year}`;
}

export function longMonth(value: string | null | undefined): string {
  const date = parseDate(value);
  if (!date) return "—";
  return `${UZ_MONTHS[date.getMonth()]} ${date.getFullYear()}`;
}

export function daysBetween(from: string | null, to: string | null): number | null {
  const start = parseDate(from);
  const end = parseDate(to);
  if (!start || !end) return null;
  return Math.max(1, Math.round((end.getTime() - start.getTime()) / 86_400_000));
}

const LANG_LABELS: Record<string, string> = {
  "uz-UZ": "O‘zbekcha",
  "ru-RU": "Ruscha",
  "en-US": "Inglizcha",
  "tr-TR": "Turkcha",
  "pl-PL": "Polyakcha",
  "ar-SA": "Arabcha",
  "es-ES": "Ispancha",
  "fa-IR": "Forscha",
};

export function langLabel(code: string | null | undefined): string {
  if (!code) return "Aniqlanmagan";
  return LANG_LABELS[code] ?? code;
}

export function roleLabel(role: string | null | undefined): string {
  if (role === "user") return "User";
  if (role === "assistant") return "Assistant";
  return role ?? "—";
}

export function shortHash(hash: string | null | undefined): string {
  if (!hash) return "—";
  return `${hash.slice(0, 6)}••••${hash.slice(-4)}`;
}

export function initials(fullName: string | null | undefined): string {
  if (!fullName) return "AI";
  const parts = fullName.trim().split(/\s+/).slice(0, 2);
  return parts.map((p) => p[0]?.toUpperCase() ?? "").join("") || "AI";
}

export function plural(count: number, one: string, few: string, many: string): string {
  const mod10 = count % 10;
  const mod100 = count % 100;
  if (mod10 === 1 && mod100 !== 11) return one;
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return few;
  return many;
}

export function truncate(text: string | null | undefined, max = 160): string {
  if (!text) return "—";
  const clean = text.replace(/\s+/g, " ").trim();
  if (clean.length <= max) return clean;
  return `${clean.slice(0, max - 1)}…`;
}

export function statusLabel(status: string): string {
  if (status === "verified") return "Tasdiqlangan";
  if (status === "draft") return "Qoralama";
  return status;
}

export function statusTone(status: string): string {
  return status === "verified" ? "green" : "amber";
}

export function kindLabel(kind: string): string {
  if (kind === "need") return "USER NEEDS";
  if (kind === "hypothesis") return "HYPOTHESIS";
  return kind.toUpperCase();
}
