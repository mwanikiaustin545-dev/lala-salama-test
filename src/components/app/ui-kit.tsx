import { useState, type ReactNode } from "react";
import { AlertTriangle, Inbox, Loader2, ShieldCheck } from "lucide-react";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ApiError } from "@/lib/api/http";

export function Logo({ compact = false }: { compact?: boolean }) {
  return (
    <div className="flex items-center gap-3">
      <div className="grid size-10 shrink-0 place-items-center rounded-lg brand-gradient ring-1 ring-border">
        <ShieldCheck className="size-5 text-primary-foreground" aria-hidden />
      </div>
      {!compact && (
        <div className="min-w-0 leading-tight">
          <p className="text-[13px] font-semibold tracking-wide">LALA SALAMA</p>
          <p className="text-[11px] text-muted-foreground">Hostel Security &amp; Management</p>
        </div>
      )}
    </div>
  );
}

export function PageHeader({ title, description, actions }: { title: string; description?: string; actions?: ReactNode }) {
  return (
    <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">{title}</h1>
        {description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2 no-print">{actions}</div>}
    </div>
  );
}

export function Panel({ title, action, children, className }: { title?: string; action?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={cn("glass p-4", className)}>
      {(title || action) && (
        <div className="mb-3 flex items-center justify-between gap-2">
          {title && <h2 className="text-sm font-semibold">{title}</h2>}
          {action}
        </div>
      )}
      {children}
    </section>
  );
}

type Tone = "default" | "success" | "warning" | "danger" | "info" | "muted";
const toneCls: Record<Tone, string> = {
  default: "text-foreground",
  success: "text-success",
  warning: "text-warning",
  danger: "text-destructive",
  info: "text-info",
  muted: "text-muted-foreground",
};

export function StatCard({ label, value, hint, tone = "default", progress }: { label: string; value: ReactNode; hint?: string; tone?: Tone; progress?: number }) {
  return (
    <div className="glass p-3 sm:p-4">
      <p className="text-[11px] text-muted-foreground">{label}</p>
      <p className={cn("mt-1 font-mono text-2xl font-medium", toneCls[tone])}>{value}</p>
      {progress !== undefined && (
        <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-secondary">
          <div className="h-full rounded-full bg-accent" style={{ width: `${Math.min(100, progress)}%` }} />
        </div>
      )}
      {hint && <p className="mt-1 text-[11px] text-muted-foreground">{hint}</p>}
    </div>
  );
}

const STATUS_TONE: Record<string, Tone> = {
  Active: "success", Paid: "success", Granted: "success", Resolved: "success", Completed: "success", Returned: "success",
  Available: "success", "Checked In": "info", Approved: "info", Claimed: "info", Assigned: "info", "In Progress": "info",
  "Under Review": "info", "Under Investigation": "info", Occupied: "info", "Partially Occupied": "info", Found: "info",
  Pending: "warning", Submitted: "warning", Reported: "warning", Reserved: "warning", "Partially Paid": "warning",
  Medium: "warning", High: "danger", Maintenance: "warning", Unclaimed: "warning", "On Leave": "warning", Lost: "warning",
  Overdue: "danger", Denied: "danger", Blacklisted: "danger", Critical: "danger", Escalated: "danger", Suspended: "danger",
  Expelled: "danger", Urgent: "danger", Failure: "danger", "Fully Occupied": "muted", Disabled: "muted", Closed: "muted",
  "Checked Out": "muted", Cancelled: "muted", Graduated: "muted", Low: "muted", Terminated: "muted", Success: "success", Normal: "muted",
};
const badgeTone: Record<Tone, string> = {
  default: "bg-secondary text-foreground ring-border",
  success: "bg-success/15 text-success ring-success/30",
  warning: "bg-warning/15 text-warning ring-warning/30",
  danger: "bg-destructive/15 text-destructive ring-destructive/30",
  info: "bg-info/15 text-info ring-info/30",
  muted: "bg-secondary text-muted-foreground ring-border",
};
export function StatusBadge({ value, tone }: { value: string; tone?: Tone }) {
  const t = tone ?? STATUS_TONE[value] ?? "default";
  return (
    <span className={cn("inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2 py-0.5 text-[11px] font-medium ring-1", badgeTone[t])}>
      <span className="size-1.5 rounded-full bg-current" aria-hidden />
      {value}
    </span>
  );
}

export function DemoBadge() {
  return <span className="rounded-full bg-secondary px-2 py-0.5 text-[10px] text-muted-foreground ring-1 ring-border">Demo data</span>;
}

export function EmptyState({ title = "Nothing here yet", message }: { title?: string; message?: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 py-10 text-center">
      <Inbox className="size-8 text-subtle" aria-hidden />
      <p className="text-sm font-medium">{title}</p>
      {message && <p className="max-w-sm text-xs text-muted-foreground">{message}</p>}
    </div>
  );
}

export function Loading({ label = "Loading…" }: { label?: string }) {
  return (
    <div role="status" className="flex items-center justify-center gap-2 py-12 text-sm text-muted-foreground">
      <Loader2 className="size-4 animate-spin" aria-hidden /> {label}
    </div>
  );
}

export function ErrorState({ error, onRetry }: { error: unknown; onRetry?: () => void }) {
  const status = error instanceof ApiError ? error.status : 0;
  return (
    <div role="alert" className="glass flex flex-col items-center gap-3 p-8 text-center">
      <AlertTriangle className="size-8 text-destructive" aria-hidden />
      <p className="font-medium">{status === 403 ? "Access denied" : "Could not load data"}</p>
      <p className="text-sm text-muted-foreground">{error instanceof Error ? error.message : "Unexpected error"}</p>
      {onRetry && status !== 403 && <Button variant="outline" size="sm" onClick={onRetry}>Try again</Button>}
    </div>
  );
}

/** Wraps a set of queries with uniform loading / error states. */
export function QueryGate({ queries, children }: { queries: { isLoading: boolean; error: unknown; refetch: () => unknown }[]; children: ReactNode }) {
  const err = queries.find((q) => q.error);
  if (err) return <ErrorState error={err.error} onRetry={() => queries.forEach((q) => q.refetch())} />;
  if (queries.some((q) => q.isLoading)) return <Loading />;
  return <>{children}</>;
}

export function useConfirm() {
  const [state, setState] = useState<{ title: string; message: string; action: string; onConfirm: () => void; danger?: boolean } | null>(null);
  const dialog = (
    <AlertDialog open={!!state} onOpenChange={(o) => !o && setState(null)}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{state?.title}</AlertDialogTitle>
          <AlertDialogDescription>{state?.message}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            className={state?.danger ? "bg-destructive text-destructive-foreground hover:bg-destructive/90" : undefined}
            onClick={() => { state?.onConfirm(); setState(null); }}
          >
            {state?.action}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
  return { confirm: setState, dialog };
}

export function KV({ items }: { items: [string, ReactNode][] }) {
  return (
    <dl className="grid grid-cols-1 gap-x-6 gap-y-3 sm:grid-cols-2">
      {items.map(([k, v]) => (
        <div key={k}>
          <dt className="text-[11px] uppercase tracking-wide text-subtle">{k}</dt>
          <dd className="mt-0.5 text-sm">{v || "—"}</dd>
        </div>
      ))}
    </dl>
  );
}
