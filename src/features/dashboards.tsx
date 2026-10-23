import { useMemo } from "react";
import { Link } from "@tanstack/react-router";
import { format, subMonths } from "date-fns";
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Line, LineChart, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { LogOut as LogOutIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DemoBadge, EmptyState, PageHeader, Panel, QueryGate, StatCard, StatusBadge } from "@/components/app/ui-kit";
import {
  useAccessLogs, useAction, useAnnouncements, useComplaints, useIncidents, useMaintenance, useNotifications,
  usePayments, useStaff, useVisitors,
} from "@/lib/api/hooks";
import { visitorsApi } from "@/lib/api/services";
import { useAuth } from "@/lib/auth/auth-context";
import { ago, d, dt, kes, kesShort, tm, today } from "@/lib/format";
import type { Visitor } from "@/lib/types";
import { axis, CHART_COLORS, chartTooltip, useArea, useLookups } from "./shared";

export function VisitorsInside({ visitors, limit }: { visitors: Visitor[]; limit?: number }) {
  const L = useLookups();
  const { can } = useAuth();
  const checkout = useAction((id: string) => visitorsApi.action(id, "check-out"), (v) => `${v.fullName} checked out`);
  const inside = visitors.filter((v) => v.status === "Checked In").slice(0, limit);
  if (!inside.length) return <EmptyState title="No visitors inside" message="All visitors have checked out." />;
  return (
    <div className="space-y-2.5">
      {inside.map((v) => (
        <div key={v.id} className="glass p-3">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="truncate text-sm font-medium">{v.fullName}{v.flagged && <span className="ml-2"><StatusBadge value="Flagged" tone="danger" /></span>}</p>
              <p className="mt-0.5 text-[11px] text-muted-foreground">Visiting {L.residentName(v.residentId)} · Room {L.roomNo(L.resident(v.residentId)?.roomId)} · {v.purpose}</p>
              <p className="mt-1 font-mono text-[10px] text-subtle">In {tm(v.checkIn)} · Due out {tm(v.expectedCheckOut)} · Officer {v.officer ?? "—"}</p>
            </div>
            {can("visitors:update") && (
              <Button size="sm" className="shrink-0 font-semibold" disabled={checkout.isPending} onClick={() => checkout.mutate(v.id)}>
                <LogOutIcon /> CHECK OUT VISITOR
              </Button>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

function Timeline({ items }: { items: { time: string; text: string; tone: "success" | "danger" | "warning" | "info" | "muted"; meta?: string }[] }) {
  const dot = { success: "bg-success", danger: "bg-destructive", warning: "bg-warning", info: "bg-info", muted: "bg-subtle" };
  if (!items.length) return <EmptyState title="No activity yet" />;
  return (
    <ol className="space-y-3 border-l border-border pl-4">
      {items.map((it, i) => (
        <li key={i} className="relative">
          <span className={`absolute -left-[21px] top-1 size-2.5 rounded-full ring-4 ring-background ${dot[it.tone]}`} aria-hidden />
          <p className="text-[13px]">{it.text}</p>
          <p className="font-mono text-[10px] text-subtle">{tm(it.time)}{it.meta ? ` · ${it.meta}` : ""}</p>
        </li>
      ))}
    </ol>
  );
}

function useSecurityFeed() {
  const access = useAccessLogs();
  const visitors = useVisitors();
  const incidents = useIncidents();
  const items = useMemo(() => {
    const out: Parameters<typeof Timeline>[0]["items"] = [];
    for (const a of access.data ?? []) {
      if (!today(a.entryTime)) continue;
      out.push({ time: a.entryTime, text: a.status === "Denied" ? `Access denied — ${a.person}` : `${a.personType} entered ${a.gate} — ${a.person}`, tone: a.status === "Denied" ? "danger" : "success", meta: a.officer });
      if (a.exitTime && today(a.exitTime)) out.push({ time: a.exitTime, text: `${a.personType} exited ${a.gate} — ${a.person}`, tone: "muted" });
    }
    for (const v of visitors.data ?? []) {
      if (today(v.createdAt) && v.status === "Pending") out.push({ time: v.createdAt, text: `Visitor registered — ${v.fullName}`, tone: "info" });
      if (v.checkIn && today(v.checkIn)) out.push({ time: v.checkIn, text: `Visitor checked in — ${v.fullName}`, tone: "info", meta: v.officer ?? undefined });
      if (v.checkOut && today(v.checkOut)) out.push({ time: v.checkOut, text: `Visitor checked out — ${v.fullName}`, tone: "muted" });
    }
    for (const i of incidents.data ?? []) if (today(i.createdAt)) out.push({ time: i.createdAt, text: `Incident reported — ${i.type}, ${i.location}`, tone: "warning", meta: i.number });
    return out.sort((a, b) => b.time.localeCompare(a.time));
  }, [access.data, visitors.data, incidents.data]);
  return { items, queries: [access, visitors, incidents] };
}

// ------------------------------------------------------------------ ADMIN
export function AdminDashboard() {
  const L = useLookups();
  const visitors = useVisitors();
  const incidents = useIncidents();
  const maintenance = useMaintenance();
  const payments = usePayments();
  const complaints = useComplaints();
  const queries = [...L.queries, visitors, incidents, maintenance, payments, complaints];

  const s = useMemo(() => {
    const occ = L.beds.filter((b) => b.status === "Occupied").length;
    const avail = L.beds.filter((b) => b.status === "Available").length;
    const outstanding = (payments.data ?? []).filter((p) => p.status !== "Paid");
    const months = Array.from({ length: 6 }, (_, i) => format(subMonths(new Date(), 5 - i), "yyyy-MM"));
    return {
      residents: L.residents.filter((r) => r.status === "Active").length,
      occ, avail, rate: L.beds.length ? Math.round((occ / L.beds.length) * 100) : 0,
      inside: (visitors.data ?? []).filter((v) => v.status === "Checked In").length,
      pendingV: (visitors.data ?? []).filter((v) => v.status === "Pending").length,
      openInc: (incidents.data ?? []).filter((i) => !["Resolved", "Closed"].includes(i.status)),
      pendingM: (maintenance.data ?? []).filter((m) => ["Pending", "Assigned", "In Progress"].includes(m.status)).length,
      outstandingAmt: outstanding.reduce((a, p) => a + p.amountDue - p.amountPaid, 0),
      overdue: outstanding.filter((p) => p.status === "Overdue").length,
      occupancyByBlock: ["A", "B", "C", "D"].map((b) => {
        const rooms = L.rooms.filter((r) => r.block === b).map((r) => r.id);
        const bs = L.beds.filter((x) => rooms.includes(x.roomId));
        return { block: `Block ${b}`, Occupied: bs.filter((x) => x.status === "Occupied").length, Available: bs.filter((x) => x.status !== "Occupied").length };
      }),
      monthly: months.map((m) => {
        const ps = (payments.data ?? []).filter((p) => p.period === m);
        return { month: format(new Date(`${m}-01`), "MMM"), Collected: ps.reduce((a, p) => a + p.amountPaid, 0), Expected: ps.reduce((a, p) => a + p.amountDue, 0) };
      }),
      visitorsByDay: Array.from({ length: 7 }, (_, i) => {
        const day = new Date(Date.now() - (6 - i) * 86400000).toDateString();
        return { day: format(new Date(day), "EEE"), Visitors: (visitors.data ?? []).filter((v) => new Date(v.createdAt).toDateString() === day).length };
      }),
      incByCat: Object.entries((incidents.data ?? []).reduce<Record<string, number>>((a, i) => ({ ...a, [i.type]: (a[i.type] ?? 0) + 1 }), {})).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value),
      maintByStatus: ["Pending", "Assigned", "In Progress", "Completed", "Cancelled"].map((st) => ({ status: st, Requests: (maintenance.data ?? []).filter((m) => m.status === st).length })),
      regTrend: months.map((m) => ({ month: format(new Date(`${m}-01`), "MMM"), Registrations: L.residents.filter((r) => r.registeredAt.slice(0, 7) === m).length })),
    };
  }, [L, visitors.data, incidents.data, maintenance.data, payments.data]);

  return (
    <QueryGate queries={queries}>
      <PageHeader title="Admin Dashboard" description={`Overview for ${format(new Date(), "EEEE, d MMMM yyyy")}`} actions={<DemoBadge />} />
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
        <StatCard label="Total Residents" value={s.residents} hint={`${L.residents.length} on record`} />
        <StatCard label="Total Rooms" value={L.rooms.length} hint="4 blocks" />
        <StatCard label="Occupied Beds" value={s.occ} hint={`of ${L.beds.length} beds`} />
        <StatCard label="Available Beds" value={s.avail} tone="success" />
        <StatCard label="Occupancy Rate" value={`${s.rate}%`} progress={s.rate} />
        <StatCard label="Visitors Inside" value={s.inside} tone="info" hint={`${s.pendingV} pending`} />
        <StatCard label="Open Incidents" value={s.openInc.length} tone="warning" hint={`${s.openInc.filter((i) => i.severity === "Critical").length} critical`} />
        <StatCard label="Pending Maintenance" value={s.pendingM} />
        <StatCard label="Outstanding" value={kesShort(s.outstandingAmt)} tone="danger" hint={`${s.overdue} overdue`} />
      </div>

      <div className="mt-5 grid gap-4 lg:grid-cols-2">
        <Panel title="Hostel occupancy by block">
          <div className="h-56"><ResponsiveContainer><BarChart data={s.occupancyByBlock}><CartesianGrid stroke="var(--border)" vertical={false} /><XAxis dataKey="block" {...axis} /><YAxis {...axis} width={28} /><Tooltip {...chartTooltip} /><Bar dataKey="Occupied" stackId="a" fill="var(--chart-1)" radius={[0, 0, 0, 0]} /><Bar dataKey="Available" stackId="a" fill="var(--chart-2)" radius={[4, 4, 0, 0]} /></BarChart></ResponsiveContainer></div>
        </Panel>
        <Panel title="Monthly payments (KES)">
          <div className="h-56"><ResponsiveContainer><AreaChart data={s.monthly}><CartesianGrid stroke="var(--border)" vertical={false} /><XAxis dataKey="month" {...axis} /><YAxis {...axis} width={48} tickFormatter={(v) => `${Math.round(v / 1000)}k`} /><Tooltip {...chartTooltip} formatter={(v: number) => kes(v)} /><Area dataKey="Expected" stroke="var(--chart-5)" fill="var(--chart-5)" fillOpacity={0.1} /><Area dataKey="Collected" stroke="var(--chart-2)" fill="var(--chart-2)" fillOpacity={0.25} /></AreaChart></ResponsiveContainer></div>
        </Panel>
        <Panel title="Visitor activity (7 days)">
          <div className="h-52"><ResponsiveContainer><LineChart data={s.visitorsByDay}><CartesianGrid stroke="var(--border)" vertical={false} /><XAxis dataKey="day" {...axis} /><YAxis {...axis} width={24} allowDecimals={false} /><Tooltip {...chartTooltip} /><Line dataKey="Visitors" stroke="var(--chart-1)" strokeWidth={2} dot={{ r: 3 }} /></LineChart></ResponsiveContainer></div>
        </Panel>
        <Panel title="Security incidents by category">
          <div className="flex h-52 items-center gap-4">
            <div className="h-full flex-1"><ResponsiveContainer><PieChart><Pie data={s.incByCat} dataKey="value" nameKey="name" innerRadius={45} outerRadius={75} paddingAngle={2}>{s.incByCat.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} stroke="none" />)}</Pie><Tooltip {...chartTooltip} /></PieChart></ResponsiveContainer></div>
            <ul className="space-y-1 text-[11px]">{s.incByCat.slice(0, 6).map((c, i) => <li key={c.name} className="flex items-center gap-2"><span className="size-2 rounded-full" style={{ background: CHART_COLORS[i % CHART_COLORS.length] }} />{c.name} <span className="font-mono text-subtle">{c.value}</span></li>)}</ul>
          </div>
        </Panel>
        <Panel title="Maintenance requests by status">
          <div className="h-52"><ResponsiveContainer><BarChart data={s.maintByStatus} layout="vertical"><XAxis type="number" {...axis} allowDecimals={false} /><YAxis type="category" dataKey="status" {...axis} width={80} /><Tooltip {...chartTooltip} /><Bar dataKey="Requests" fill="var(--chart-3)" radius={[0, 4, 4, 0]} /></BarChart></ResponsiveContainer></div>
        </Panel>
        <Panel title="Resident registration trend">
          <div className="h-52"><ResponsiveContainer><BarChart data={s.regTrend}><CartesianGrid stroke="var(--border)" vertical={false} /><XAxis dataKey="month" {...axis} /><YAxis {...axis} width={24} allowDecimals={false} /><Tooltip {...chartTooltip} /><Bar dataKey="Registrations" fill="var(--chart-2)" radius={[4, 4, 0, 0]} /></BarChart></ResponsiveContainer></div>
        </Panel>
      </div>

      <div className="mt-5 grid gap-4 lg:grid-cols-2">
        <Panel title="Currently Inside Hostel" action={<Link to="/admin/visitors" className="text-xs text-primary hover:underline">All visitors</Link>}>
          <VisitorsInside visitors={visitors.data ?? []} limit={4} />
        </Panel>
        <Panel title="Recent activity">
          <RecentList rows={[
            ...(visitors.data ?? []).filter((v) => v.checkIn).map((v) => ({ t: v.checkOut ?? v.checkIn!, text: `${v.fullName} ${v.checkOut ? "checked out" : "checked in"}`, badge: v.status })),
            ...(incidents.data ?? []).map((i) => ({ t: i.createdAt, text: `${i.type} — ${i.location}`, badge: i.severity })),
            ...(payments.data ?? []).filter((p) => p.paidAt).map((p) => ({ t: p.paidAt!, text: `Payment ${kes(p.amountPaid)} · ${L.residentName(p.residentId)}`, badge: p.status })),
            ...(complaints.data ?? []).map((c) => ({ t: c.submittedAt, text: `Complaint: ${c.subject}`, badge: c.status })),
            ...(maintenance.data ?? []).map((m) => ({ t: m.createdAt, text: `${m.category} request · Room ${L.roomNo(m.roomId)}`, badge: m.status })),
          ]} />
        </Panel>
      </div>
    </QueryGate>
  );
}

function RecentList({ rows }: { rows: { t: string; text: string; badge: string }[] }) {
  const sorted = [...rows].sort((a, b) => b.t.localeCompare(a.t)).slice(0, 10);
  return (
    <ul className="divide-y divide-border">
      {sorted.map((r, i) => (
        <li key={i} className="flex items-center justify-between gap-3 py-2">
          <div className="min-w-0"><p className="truncate text-[13px]">{r.text}</p><p className="font-mono text-[10px] text-subtle">{ago(r.t)}</p></div>
          <StatusBadge value={r.badge} />
        </li>
      ))}
    </ul>
  );
}

// --------------------------------------------------------------- SECURITY
export function SecurityDashboard({ monitoring = false }: { monitoring?: boolean }) {
  const access = useAccessLogs();
  const visitors = useVisitors();
  const incidents = useIncidents();
  const staff = useStaff();
  const feed = useSecurityFeed();
  const area = useArea();
  const A = access.data ?? [];
  const inside = A.filter((a) => a.status === "Granted" && !a.exitTime);
  const openInc = (incidents.data ?? []).filter((i) => !["Resolved", "Closed"].includes(i.status));
  const denied = A.filter((a) => a.status === "Denied");
  const officers = (staff.data ?? []).filter((s) => s.role === "Security Officer" && s.status === "Active");
  return (
    <QueryGate queries={[access, visitors, incidents]}>
      <PageHeader title={monitoring ? "Security Monitoring" : "Security Dashboard"} description="Live overview of hostel entry, exit and incidents" actions={<DemoBadge />} />
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatCard label="People inside" value={inside.length} tone="info" />
        <StatCard label="Visitors inside" value={(visitors.data ?? []).filter((v) => v.status === "Checked In").length} />
        <StatCard label="Today's entries" value={A.filter((a) => today(a.entryTime)).length} />
        <StatCard label="Today's exits" value={A.filter((a) => today(a.exitTime)).length} />
        <StatCard label="Open incidents" value={openInc.length} tone="warning" />
        <StatCard label="Critical incidents" value={openInc.filter((i) => i.severity === "Critical").length} tone="danger" />
        <StatCard label="Denied attempts" value={denied.length} tone="danger" hint={`${denied.filter((a) => today(a.entryTime)).length} today`} />
        <StatCard label="Active officers" value={staff.data ? officers.length : "—"} tone="success" />
      </div>
      <div className="mt-5 grid gap-4 lg:grid-cols-[1.4fr_1fr]">
        <Panel title="Currently Inside Hostel" action={<DemoBadge />}><VisitorsInside visitors={visitors.data ?? []} /></Panel>
        <Panel title="Today's activity timeline"><Timeline items={feed.items.slice(0, 12)} /></Panel>
      </div>
      <div className="mt-5 grid gap-4 lg:grid-cols-2">
        <Panel title="Suspicious / denied access attempts">
          {denied.length ? (
            <ul className="divide-y divide-border">{denied.slice(0, 6).map((a) => (
              <li key={a.id} className="flex items-center justify-between gap-2 py-2 text-[13px]">
                <div><p>{a.person} <span className="text-subtle">({a.personType})</span></p><p className="font-mono text-[10px] text-subtle">{dt(a.entryTime)} · {a.gate} · {a.officer}</p></div>
                <StatusBadge value="Denied" />
              </li>))}</ul>
          ) : <EmptyState title="No denied attempts" />}
        </Panel>
        <Panel title="Recent incidents" action={<Link to={(area === "security" ? "/security/incidents" : "/admin/incidents") as never} className="text-xs text-primary hover:underline">View all</Link>}>
          <ul className="divide-y divide-border">{(incidents.data ?? []).slice().sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 6).map((i) => (
            <li key={i.id} className="flex items-center justify-between gap-2 py-2 text-[13px]">
              <div className="min-w-0"><p className="truncate">{i.type} — {i.location}</p><p className="font-mono text-[10px] text-subtle">{i.number} · {ago(i.createdAt)}</p></div>
              <div className="flex gap-1"><StatusBadge value={i.severity} /><StatusBadge value={i.status} /></div>
            </li>))}</ul>
        </Panel>
        {monitoring && (
          <Panel title="Security officer activity" className="lg:col-span-2">
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
              {officers.map((o) => {
                const n = A.filter((a) => a.officer === o.fullName && today(a.entryTime)).length;
                return (
                  <div key={o.id} className="rounded-lg bg-secondary p-3">
                    <div className="flex items-center justify-between"><p className="text-sm font-medium">{o.fullName}</p><span className="size-2 rounded-full bg-success" aria-label="On duty" /></div>
                    <p className="mt-1 text-[11px] text-muted-foreground">{n} gate actions today</p>
                  </div>
                );
              })}
            </div>
          </Panel>
        )}
      </div>
    </QueryGate>
  );
}

// --------------------------------------------------------------- RESIDENT
export function ResidentDashboard() {
  const { user } = useAuth();
  const L = useLookups();
  const payments = usePayments();
  const visitors = useVisitors();
  const maintenance = useMaintenance();
  const complaints = useComplaints();
  const ann = useAnnouncements();
  const notifs = useNotifications();
  const me = L.resident(user?.residentId);
  const current = (payments.data ?? []).slice().sort((a, b) => b.period.localeCompare(a.period))[0];
  const balance = (payments.data ?? []).reduce((a, p) => a + p.amountDue - p.amountPaid, 0);
  return (
    <QueryGate queries={[...L.queries, payments, visitors, maintenance, complaints, ann]}>
      <PageHeader title={`Welcome back, ${user?.fullName.split(" ")[0]}`} description="Here's what's happening with your stay." actions={<DemoBadge />} />
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        <StatCard label="Room" value={L.roomNo(me?.roomId)} hint={L.room(me?.roomId)?.type} />
        <StatCard label="Bed" value={L.bed(me?.bedId)?.number ?? "—"} />
        <StatCard label="Payment status" value={current?.status ?? "—"} tone={current?.status === "Paid" ? "success" : "warning"} />
        <StatCard label="Balance" value={kesShort(balance)} tone={balance > 0 ? "danger" : "success"} hint={current ? `Due ${d(current.dueDate)}` : undefined} />
        <StatCard label="Visitor requests" value={(visitors.data ?? []).filter((v) => ["Pending", "Approved", "Checked In"].includes(v.status)).length} tone="info" />
        <StatCard label="Open requests" value={(maintenance.data ?? []).filter((m) => !["Completed", "Cancelled"].includes(m.status)).length + (complaints.data ?? []).filter((c) => !["Resolved", "Closed"].includes(c.status)).length} />
      </div>
      <div className="mt-5 grid gap-4 lg:grid-cols-2">
        <Panel title="Recent announcements" action={<Link to="/resident/announcements" className="text-xs text-primary hover:underline">All</Link>}>
          <ul className="space-y-3">{(ann.data ?? []).filter((a) => a.expiresAt >= new Date().toISOString().slice(0, 10)).slice(0, 4).map((a) => (
            <li key={a.id} className="rounded-lg bg-secondary p-3"><div className="flex items-center justify-between gap-2"><p className="text-sm font-medium">{a.title}</p><StatusBadge value={a.category} tone={a.category === "Emergency" ? "danger" : a.category === "Security" ? "warning" : "info"} /></div><p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{a.message}</p></li>
          ))}</ul>
        </Panel>
        <Panel title="Notifications" action={<Link to="/resident/notifications" className="text-xs text-primary hover:underline">All</Link>}>
          <ul className="divide-y divide-border">{(notifs.data ?? []).slice(0, 5).map((n) => (
            <li key={n.id} className="py-2"><p className="text-[13px] font-medium">{n.title}</p><p className="text-xs text-muted-foreground">{n.message}</p><p className="font-mono text-[10px] text-subtle">{ago(n.createdAt)}</p></li>
          ))}</ul>
        </Panel>
        <Panel title="My maintenance requests">
          {(maintenance.data ?? []).length ? <ul className="divide-y divide-border">{(maintenance.data ?? []).slice(0, 4).map((m) => <li key={m.id} className="flex items-center justify-between py-2 text-[13px]"><span>{m.category} · {d(m.createdAt)}</span><StatusBadge value={m.status} /></li>)}</ul> : <EmptyState />}
        </Panel>
        <Panel title="My complaints">
          {(complaints.data ?? []).length ? <ul className="divide-y divide-border">{(complaints.data ?? []).slice(0, 4).map((c) => <li key={c.id} className="flex items-center justify-between py-2 text-[13px]"><span className="truncate">{c.subject}</span><StatusBadge value={c.status} /></li>)}</ul> : <EmptyState />}
        </Panel>
      </div>
    </QueryGate>
  );
}

export const MonitoringPage = () => <SecurityDashboard monitoring />;
