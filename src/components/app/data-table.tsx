import { useMemo, useState, type ReactNode } from "react";
import { ArrowDown, ArrowUp, ChevronLeft, ChevronRight, Download, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "./ui-kit";
import { downloadCsv } from "@/lib/format";

export interface Column<T> {
  key: string;
  header: string;
  cell?: (row: T) => ReactNode;
  value?: (row: T) => string | number | null | undefined;
  className?: string;
  hideOnMobile?: boolean;
}
export interface FilterDef<T> { key: string; label: string; options: string[]; value: (row: T) => string }

interface Props<T> {
  data: T[];
  columns: Column<T>[];
  searchPlaceholder?: string;
  filters?: FilterDef<T>[];
  dateField?: (row: T) => string | null | undefined;
  exportName?: string;
  pageSize?: number;
  toolbar?: ReactNode;
  onRowClick?: (row: T) => void;
  rowKey: (row: T) => string;
  emptyMessage?: string;
}

export function DataTable<T>({ data, columns, searchPlaceholder = "Search…", filters = [], dateField, exportName, pageSize = 10, toolbar, onRowClick, rowKey, emptyMessage }: Props<T>) {
  const [q, setQ] = useState("");
  const [f, setF] = useState<Record<string, string>>({});
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [sort, setSort] = useState<{ key: string; dir: 1 | -1 } | null>(null);
  const [page, setPage] = useState(0);

  const val = (c: Column<T>, r: T) => (c.value ? c.value(r) : (r as Record<string, unknown>)[c.key]) as string | number | null | undefined;

  const rows = useMemo(() => {
    let out = data;
    const needle = q.trim().toLowerCase();
    if (needle) out = out.filter((r) => columns.some((c) => String(val(c, r) ?? "").toLowerCase().includes(needle)));
    for (const fd of filters) if (f[fd.key]) out = out.filter((r) => fd.value(r) === f[fd.key]);
    if (dateField && (from || to)) {
      out = out.filter((r) => {
        const v = dateField(r)?.slice(0, 10);
        if (!v) return false;
        return (!from || v >= from) && (!to || v <= to);
      });
    }
    if (sort) {
      const c = columns.find((x) => x.key === sort.key)!;
      out = [...out].sort((a, b) => {
        const x = val(c, a) ?? "", y = val(c, b) ?? "";
        return (x > y ? 1 : x < y ? -1 : 0) * sort.dir;
      });
    }
    return out;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, q, f, from, to, sort]);

  const pages = Math.max(1, Math.ceil(rows.length / pageSize));
  const p = Math.min(page, pages - 1);
  const view = rows.slice(p * pageSize, p * pageSize + pageSize);

  const exportRows = () =>
    downloadCsv(exportName ?? "export", rows.map((r) => Object.fromEntries(columns.map((c) => [c.header, val(c, r) ?? ""]))));

  return (
    <div className="glass overflow-hidden">
      <div className="flex flex-col gap-2 border-b border-border p-3 lg:flex-row lg:items-center no-print">
        <label className="relative flex-1">
          <span className="sr-only">Search</span>
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-subtle" aria-hidden />
          <input className="field pl-9" placeholder={searchPlaceholder} value={q} onChange={(e) => { setQ(e.target.value); setPage(0); }} />
        </label>
        <div className="flex flex-wrap items-center gap-2">
          {filters.map((fd) => (
            <select key={fd.key} aria-label={fd.label} className="field h-10 w-auto min-w-32" value={f[fd.key] ?? ""}
              onChange={(e) => { setF({ ...f, [fd.key]: e.target.value }); setPage(0); }}>
              <option value="">All {fd.label.toLowerCase()}</option>
              {fd.options.map((o) => <option key={o} value={o}>{o}</option>)}
            </select>
          ))}
          {dateField && (
            <>
              <input type="date" aria-label="From date" className="field w-auto" value={from} onChange={(e) => setFrom(e.target.value)} />
              <input type="date" aria-label="To date" className="field w-auto" value={to} onChange={(e) => setTo(e.target.value)} />
            </>
          )}
          {exportName && <Button variant="outline" size="sm" className="h-10" onClick={exportRows}><Download /> CSV</Button>}
          {toolbar}
        </div>
      </div>

      {view.length === 0 ? (
        <EmptyState title="No records found" message={emptyMessage ?? "Try adjusting your search or filters."} />
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-[11px] uppercase tracking-wide text-subtle">
                {columns.map((c) => (
                  <th key={c.key} scope="col" className={`px-3 py-2.5 font-medium ${c.hideOnMobile ? "hidden md:table-cell" : ""}`}>
                    <button type="button" className="inline-flex items-center gap-1 hover:text-foreground"
                      onClick={() => setSort(sort?.key === c.key ? { key: c.key, dir: sort.dir === 1 ? -1 : 1 } : { key: c.key, dir: 1 })}>
                      {c.header}
                      {sort?.key === c.key && (sort.dir === 1 ? <ArrowUp className="size-3" /> : <ArrowDown className="size-3" />)}
                    </button>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {view.map((r) => (
                <tr key={rowKey(r)} onClick={onRowClick ? () => onRowClick(r) : undefined}
                  className={`border-b border-border/60 last:border-0 ${onRowClick ? "cursor-pointer hover:bg-secondary" : ""}`}>
                  {columns.map((c) => (
                    <td key={c.key} className={`px-3 py-2.5 align-middle ${c.hideOnMobile ? "hidden md:table-cell" : ""} ${c.className ?? ""}`}>
                      {c.cell ? c.cell(r) : String(val(c, r) ?? "—")}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="flex items-center justify-between gap-2 border-t border-border px-3 py-2 text-xs text-muted-foreground no-print">
        <span>{rows.length} record{rows.length === 1 ? "" : "s"}</span>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" aria-label="Previous page" disabled={p === 0} onClick={() => setPage(p - 1)}><ChevronLeft /></Button>
          <span className="font-mono">{p + 1} / {pages}</span>
          <Button variant="ghost" size="icon" aria-label="Next page" disabled={p >= pages - 1} onClick={() => setPage(p + 1)}><ChevronRight /></Button>
        </div>
      </div>
    </div>
  );
}
