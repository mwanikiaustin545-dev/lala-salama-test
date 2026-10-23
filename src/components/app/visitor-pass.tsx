import { ShieldCheck } from "lucide-react";
import type { Visitor } from "@/lib/types";
import { d, tm } from "@/lib/format";

/**
 * QR placeholder: a deterministic 21x21 module pattern derived from the pass
 * payload. Swap <QrPlaceholder> for a real encoder (e.g. `qrcode` package)
 * fed the same `payload` string — no other changes needed.
 */
export function QrPlaceholder({ payload, size = 132 }: { payload: string; size?: number }) {
  const n = 21;
  let h = 2166136261;
  const bits: boolean[] = [];
  for (let i = 0; i < n * n; i++) {
    h ^= payload.charCodeAt(i % payload.length) + i; h = Math.imul(h, 16777619);
    bits.push(((h >>> 0) & 3) === 0 || ((h >>> 7) & 1) === 1);
  }
  const finder = (x: number, y: number) => {
    for (const [fx, fy] of [[0, 0], [n - 7, 0], [0, n - 7]]) {
      const dx = x - fx, dy = y - fy;
      if (dx >= 0 && dx < 7 && dy >= 0 && dy < 7) return dx === 0 || dx === 6 || dy === 0 || dy === 6 || (dx >= 2 && dx <= 4 && dy >= 2 && dy <= 4) ? 1 : 0;
    }
    return -1;
  };
  const c = size / n;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} role="img" aria-label="QR code placeholder" className="rounded bg-foreground p-1">
      {Array.from({ length: n * n }, (_, i) => {
        const x = i % n, y = Math.floor(i / n);
        const f = finder(x, y);
        const on = f === -1 ? bits[i] : f === 1;
        return on ? <rect key={i} x={x * c} y={y * c} width={c} height={c} className="fill-ink" /> : null;
      })}
    </svg>
  );
}

export function VisitorPass({ visitor, residentName, room }: { visitor: Visitor; residentName: string; room: string }) {
  const payload = JSON.stringify({ pass: visitor.passNo, v: visitor.id, r: visitor.residentId });
  return (
    <div className="overflow-hidden rounded-xl ring-1 ring-border">
      <div className="flex items-center justify-between brand-gradient px-4 py-3 text-primary-foreground">
        <div className="flex items-center gap-2">
          <ShieldCheck className="size-5" aria-hidden />
          <div className="leading-tight">
            <p className="text-xs font-semibold tracking-wider">LALA SALAMA</p>
            <p className="text-[10px] opacity-90">Digital Visitor Pass</p>
          </div>
        </div>
        <span className="rounded bg-ink/30 px-2 py-0.5 font-mono text-[11px]">{visitor.status.toUpperCase()}</span>
      </div>
      <div className="grid gap-4 bg-surface p-4 sm:grid-cols-[1fr_auto]">
        <dl className="grid grid-cols-2 gap-3 text-sm">
          <div className="col-span-2"><dt className="text-[10px] uppercase text-subtle">Visitor</dt><dd className="text-lg font-semibold">{visitor.fullName}</dd></div>
          <div><dt className="text-[10px] uppercase text-subtle">Visitor ID</dt><dd className="font-mono">{visitor.id}</dd></div>
          <div><dt className="text-[10px] uppercase text-subtle">Date</dt><dd>{d(visitor.checkIn ?? visitor.createdAt)}</dd></div>
          <div><dt className="text-[10px] uppercase text-subtle">Visiting</dt><dd>{residentName}</dd></div>
          <div><dt className="text-[10px] uppercase text-subtle">Room</dt><dd>{room}</dd></div>
          <div><dt className="text-[10px] uppercase text-subtle">Check-in</dt><dd className="font-mono">{tm(visitor.checkIn)}</dd></div>
          <div><dt className="text-[10px] uppercase text-subtle">Expected exit</dt><dd className="font-mono">{tm(visitor.expectedCheckOut)}</dd></div>
        </dl>
        <div className="flex flex-col items-center gap-2">
          <QrPlaceholder payload={payload} />
          <p className="font-mono text-xs tracking-wider">{visitor.passNo}</p>
        </div>
      </div>
      <p className="border-t border-border bg-surface px-4 py-2 text-[10px] text-subtle">
        Present this pass and original ID at the gate. Pass is valid for this visit only and is non-transferable.
      </p>
    </div>
  );
}
