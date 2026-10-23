import { format, formatDistanceToNow, isToday } from "date-fns";

export const kes = (n: number) => `KES ${Math.round(n).toLocaleString("en-KE")}`;
export const kesShort = (n: number) => (n >= 1000 ? `KES ${(n / 1000).toFixed(n >= 100000 ? 0 : 1)}k` : kes(n));
export const dt = (iso?: string | null) => (iso ? format(new Date(iso), "dd MMM yyyy, HH:mm") : "—");
export const d = (iso?: string | null) => (iso ? format(new Date(iso), "dd MMM yyyy") : "—");
export const tm = (iso?: string | null) => (iso ? format(new Date(iso), "HH:mm") : "—");
export const ago = (iso?: string | null) => (iso ? formatDistanceToNow(new Date(iso), { addSuffix: true }) : "—");
export const today = (iso?: string | null) => !!iso && isToday(new Date(iso));
export const initials = (n: string) => n.split(" ").map((x) => x[0]).slice(0, 2).join("").toUpperCase();

export function downloadCsv(name: string, rows: Record<string, unknown>[]) {
  if (!rows.length) return;
  const cols = Object.keys(rows[0]);
  const esc = (v: unknown) => {
    let s = v == null ? "" : String(v);
    if (/^[=+\-@]/.test(s)) s = `'${s}`; // CSV injection guard
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const csv = [cols.join(","), ...rows.map((r) => cols.map((c) => esc(r[c])).join(","))].join("\n");
  const url = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
  const a = document.createElement("a");
  a.href = url; a.download = `${name}-${format(new Date(), "yyyyMMdd-HHmm")}.csv`; a.click();
  URL.revokeObjectURL(url);
}
