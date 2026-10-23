import { useMemo, useState } from "react";
import { Bell, CheckCheck, Megaphone, Plus, Printer, Receipt } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DataTable } from "@/components/app/data-table";
import { FormDialog } from "@/components/app/form-dialog";
import { DemoBadge, EmptyState, KV, Logo, PageHeader, Panel, QueryGate, StatCard, StatusBadge, useConfirm } from "@/components/app/ui-kit";
import { useAction, useAnnouncements, useComplaints, useMaintenance, useNotifications, usePayments, useStaff } from "@/lib/api/hooks";
import { announcementsApi, complaintsApi, maintenanceApi, notificationsApi, paymentsApi, staffApi } from "@/lib/api/services";
import { useAuth } from "@/lib/auth/auth-context";
import { announcementSchema, complaintSchema, maintenanceSchema, paymentSchema, staffSchema, workUpdateSchema } from "@/lib/validation";
import { ago, d, dt, initials, kes, kesShort } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { Complaint, MaintenanceRequest, Payment, Staff } from "@/lib/types";
import { useLookups } from "./shared";

// -------------------------------------------------------------- PAYMENTS
function ReceiptView({ p, name, admission }: { p: Payment; name: string; admission: string }) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between border-b border-border pb-3"><Logo /><span className="font-mono text-xs text-muted-foreground">RECEIPT {p.id}</span></div>
      <KV items={[["Resident", name], ["Resident ID", `${p.residentId} · ${admission}`], ["Period", p.period], ["Amount due", kes(p.amountDue)], ["Amount paid", kes(p.amountPaid)], ["Balance", kes(p.amountDue - p.amountPaid)], ["Method", p.method], ["Transaction ref", <span key="r" className="font-mono">{p.reference}</span>], ["Payment date", dt(p.paidAt)], ["Status", <StatusBadge key="s" value={p.status} />]]} />
      <p className="text-[10px] text-subtle">System-generated receipt. Verify transaction reference with the payment provider.</p>
    </div>
  );
}

export function PaymentsPage({ outstandingOnly = false, mine = false }: { outstandingOnly?: boolean; mine?: boolean }) {
  const L = useLookups();
  const payments = usePayments();
  const { can } = useAuth();
  const [adding, setAdding] = useState(false);
  const [rcpt, setRcpt] = useState<Payment | null>(null);
  const record = useAction((data: Record<string, unknown>) => paymentsApi.create(data), (p) => `Payment recorded — ${p.status}`);
  const P = payments.data ?? [];
  const rows = outstandingOnly ? P.filter((p) => p.status !== "Paid") : P;
  const thisMonth = new Date().toISOString().slice(0, 7);
  const out = P.filter((p) => p.status !== "Paid");
  const balances = useMemo(() => {
    const m = new Map<string, number>();
    out.forEach((p) => m.set(p.residentId, (m.get(p.residentId) ?? 0) + p.amountDue - p.amountPaid));
    return [...m.entries()].sort((a, b) => b[1] - a[1]);
  }, [out]);

  return (
    <QueryGate queries={[...L.queries, payments]}>
      <PageHeader title={mine ? "My Payments" : outstandingOnly ? "Outstanding Payments" : "Payments"}
        description={mine ? "Pay via M-Pesa Paybill 400200, account = your admission number. Payments reflect once confirmed." : "Payments are recorded against provider transaction references. No card/M-Pesa processing happens in this app."}
        actions={<><DemoBadge />{can("payments:create") && <Button onClick={() => setAdding(true)}><Plus /> Record payment</Button>}</>} />
      <div className="mb-4 grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatCard label={mine ? "Total paid" : "Collected this month"} value={kesShort((mine ? P : P.filter((p) => p.period === thisMonth)).reduce((a, p) => a + p.amountPaid, 0))} tone="success" />
        <StatCard label="Outstanding balance" value={kesShort(out.reduce((a, p) => a + p.amountDue - p.amountPaid, 0))} tone="danger" />
        <StatCard label="Overdue records" value={out.filter((p) => p.status === "Overdue").length} tone="danger" />
        <StatCard label="Pending / partial" value={out.filter((p) => p.status !== "Overdue").length} tone="warning" />
      </div>
      {outstandingOnly && (
        <Panel title="Top outstanding balances by resident" className="mb-4">
          {balances.length ? <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">{balances.slice(0, 9).map(([id, amt]) => <li key={id} className="flex items-center justify-between rounded-lg bg-secondary px-3 py-2 text-sm"><span className="truncate">{L.residentName(id)}</span><span className="font-mono text-destructive">{kes(amt)}</span></li>)}</ul> : <EmptyState title="No outstanding balances" />}
        </Panel>
      )}
      <DataTable data={[...rows].sort((a, b) => b.period.localeCompare(a.period))} rowKey={(p) => p.id} exportName={outstandingOnly ? "outstanding-payments" : "payments"} dateField={(p) => p.dueDate}
        filters={[{ key: "status", label: "Statuses", options: ["Paid", "Pending", "Overdue", "Partially Paid"], value: (p) => p.status }, { key: "method", label: "Methods", options: ["M-Pesa", "Bank", "Cash", "Other"], value: (p) => p.method ?? "" }, { key: "period", label: "Periods", options: [...new Set(P.map((p) => p.period))].sort().reverse(), value: (p) => p.period }]}
        columns={[
          { key: "id", header: "Payment ID", cell: (p) => <span className="font-mono text-xs">{p.id}</span> },
          ...(mine ? [] : [{ key: "res", header: "Resident", value: (p: Payment) => `${L.residentName(p.residentId)} ${p.residentId}`, cell: (p: Payment) => <div><p>{L.residentName(p.residentId)}</p><p className="font-mono text-[10px] text-subtle">{p.residentId}</p></div> }]),
          { key: "period", header: "Period" },
          { key: "amountPaid", header: "Paid / Due", cell: (p) => <span className="font-mono text-xs">{kes(p.amountPaid)} / {kes(p.amountDue)}</span> },
          { key: "method", header: "Method", hideOnMobile: true, value: (p) => p.method ?? "—" },
          { key: "reference", header: "Reference", hideOnMobile: true, cell: (p) => <span className="font-mono text-xs">{p.reference || "—"}</span> },
          { key: "dueDate", header: "Due", cell: (p) => d(p.dueDate) },
          { key: "status", header: "Status", cell: (p) => <StatusBadge value={p.status} /> },
          { key: "act", header: "", value: () => "", cell: (p) => p.amountPaid > 0 ? <Button size="sm" variant="ghost" onClick={(e) => { e.stopPropagation(); setRcpt(p); }}><Receipt /> Receipt</Button> : null },
        ]} />
      <FormDialog open={adding} onOpenChange={setAdding} title="Record payment" description="Enter a payment already confirmed by M-Pesa, bank or cashier. Duplicate references are rejected." schema={paymentSchema}
        initial={{ residentId: "", amountPaid: "", method: "M-Pesa", reference: "", period: thisMonth }}
        fields={[{ name: "residentId", label: "Resident", type: "select", options: L.residents.filter((r) => r.roomId).map((r) => ({ value: r.id, label: `${r.fullName} (${r.id})` })) }, { name: "period", label: "Billing period (YYYY-MM)" }, { name: "amountPaid", label: "Amount (KES)", type: "number" }, { name: "method", label: "Method", type: "select", options: ["M-Pesa", "Bank", "Cash", "Other"] }, { name: "reference", label: "Transaction reference", full: true }]}
        onSubmit={(data) => record.mutateAsync(data)} />
      <Dialog open={!!rcpt} onOpenChange={(o) => !o && setRcpt(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Payment receipt</DialogTitle></DialogHeader>
          {rcpt && <ReceiptView p={rcpt} name={L.residentName(rcpt.residentId)} admission={L.resident(rcpt.residentId)?.admissionNo ?? ""} />}
          <div className="flex justify-end"><Button variant="outline" onClick={() => window.print()}><Printer /> Print</Button></div>
        </DialogContent>
      </Dialog>
    </QueryGate>
  );
}

// --------------------------------------------- MAINTENANCE & COMPLAINTS
type Work = (MaintenanceRequest | Complaint) & { id: string };
function WorkPage({ kind }: { kind: "maintenance" | "complaints" }) {
  const L = useLookups();
  const m = useMaintenance();
  const c = useComplaints();
  const staff = useStaff();
  const { can, role } = useAuth();
  const isM = kind === "maintenance";
  const q = isM ? m : c;
  const rows = (q.data ?? []) as Work[];
  const [adding, setAdding] = useState(false);
  const [sel, setSel] = useState<Work | null>(null);
  const api = isM ? maintenanceApi : complaintsApi;
  const create = useAction((data: Record<string, unknown>) => api.create(data), "Request submitted");
  const update = useAction((v: { id: string; data: Record<string, unknown> }) => api.update(v.id, v.data), "Updated");
  const statuses = isM ? ["Pending", "Assigned", "In Progress", "Completed", "Cancelled"] : ["Submitted", "Under Review", "In Progress", "Resolved", "Closed"];
  const cats = isM ? ["Plumbing", "Electrical", "Furniture", "Internet", "Cleaning", "Room Damage", "Other"] : ["Security", "Noise", "Room", "Maintenance", "Staff", "Neighbor", "Other"];
  const date = (w: Work) => ("createdAt" in w ? w.createdAt : (w as Complaint).submittedAt);
  const assignee = (w: Work) => ("technician" in w ? w.technician : (w as Complaint).assignedStaff);
  const people = (staff.data ?? []).filter((s) => (isM ? s.role === "Maintenance Technician" : ["Administrator", "Manager"].includes(s.role))).map((s) => s.fullName);
  const isResident = role === "RESIDENT";
  const canEdit = can(isM ? "maintenance:update" : "complaints:update");
  const open = rows.filter((w) => !["Completed", "Cancelled", "Resolved", "Closed"].includes(w.status));

  return (
    <QueryGate queries={[...L.queries, q]}>
      <PageHeader title={isM ? (isResident ? "My Maintenance Requests" : "Maintenance") : isResident ? "My Complaints" : "Complaints"}
        description={isM ? "Report and track repairs in rooms and common areas." : "Raise concerns with hostel management."}
        actions={<><DemoBadge />{can(isM ? "maintenance:create" : "complaints:create") && isResident && <Button onClick={() => setAdding(true)}><Plus /> {isM ? "New request" : "New complaint"}</Button>}</>} />
      <div className="mb-4 grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatCard label="Total" value={rows.length} />
        <StatCard label="Open" value={open.length} tone="warning" />
        <StatCard label="Urgent / high (open)" value={open.filter((w) => ["Urgent", "High"].includes(w.priority)).length} tone="danger" />
        <StatCard label={isM ? "Completed" : "Resolved"} value={rows.filter((w) => ["Completed", "Resolved", "Closed"].includes(w.status)).length} tone="success" />
      </div>
      <DataTable data={[...rows].sort((a, b) => date(b).localeCompare(date(a)))} rowKey={(w) => w.id} exportName={kind} dateField={date} onRowClick={setSel}
        filters={[{ key: "status", label: "Statuses", options: statuses, value: (w) => w.status }, { key: "cat", label: "Categories", options: cats, value: (w) => w.category }, { key: "pri", label: "Priorities", options: ["Low", "Medium", "High", "Urgent"], value: (w) => w.priority }]}
        columns={[
          { key: "id", header: "ID", cell: (w) => <span className="font-mono text-xs">{w.id}</span> },
          ...(isResident ? [] : [{ key: "res", header: "Resident", value: (w: Work) => L.residentName(w.residentId) }]),
          ...(isM ? [{ key: "room", header: "Room", value: (w: Work) => L.roomNo((w as MaintenanceRequest).roomId) }] : []),
          { key: "category", header: "Category" },
          { key: "desc", header: isM ? "Description" : "Subject", hideOnMobile: true, value: (w) => ("subject" in w ? w.subject : w.description), cell: (w) => <span className="line-clamp-1 max-w-xs">{"subject" in w ? w.subject : w.description}</span> },
          { key: "priority", header: "Priority", cell: (w) => <StatusBadge value={w.priority} /> },
          { key: "date", header: "Date", value: date, cell: (w) => d(date(w)) },
          { key: "assignee", header: isM ? "Technician" : "Assigned", hideOnMobile: true, value: (w) => assignee(w) ?? "—" },
          { key: "status", header: "Status", cell: (w) => <StatusBadge value={w.status} /> },
        ]} />
      <FormDialog open={adding} onOpenChange={setAdding} title={isM ? "New maintenance request" : "New complaint"} schema={isM ? maintenanceSchema : complaintSchema}
        initial={isM ? { category: "", description: "", priority: "Medium" } : { category: "", subject: "", description: "", priority: "Medium" }}
        fields={[{ name: "category", label: "Category", type: "select", options: cats }, { name: "priority", label: "Priority", type: "select", options: ["Low", "Medium", "High", "Urgent"] }, ...(isM ? [] : [{ name: "subject", label: "Subject", full: true }]), { name: "description", label: "Description", type: "textarea" as const }]}
        onSubmit={(data) => create.mutateAsync(data)} />
      <FormDialog open={!!sel && canEdit} onOpenChange={(o) => !o && setSel(null)} title={`Update ${sel?.id}`} description={sel ? ("subject" in sel ? `${sel.subject} — ${sel.description}` : sel.description) : ""} schema={workUpdateSchema}
        initial={{ status: sel?.status ?? "", assignee: sel ? assignee(sel) ?? "" : "", resolution: sel?.resolution ?? "" }}
        fields={[{ name: "status", label: "Status", type: "select", options: statuses }, { name: "assignee", label: isM ? "Assign technician" : "Assign staff", type: "select", options: ["", ...people].map((p) => ({ value: p, label: p || "Unassigned" })) }, { name: "resolution", label: "Resolution", type: "textarea" }]}
        onSubmit={(data) => update.mutateAsync({ id: sel!.id, data })} />
      <Dialog open={!!sel && !canEdit} onOpenChange={(o) => !o && setSel(null)}>
        <DialogContent><DialogHeader><DialogTitle>{sel?.id}</DialogTitle></DialogHeader>
          {sel && <KV items={[["Category", sel.category], ["Priority", sel.priority], ["Status", sel.status], ["Date", dt(date(sel))], ["Assigned", assignee(sel)], ["Details", "subject" in sel ? `${sel.subject}: ${sel.description}` : sel.description], ["Resolution", sel.resolution]]} />}
        </DialogContent>
      </Dialog>
    </QueryGate>
  );
}
export const MaintenancePage = () => <WorkPage kind="maintenance" />;
export const ComplaintsPage = () => <WorkPage kind="complaints" />;

// ----------------------------------------------------------------- STAFF
export function StaffPage() {
  const staff = useStaff();
  const { can } = useAuth();
  const [edit, setEdit] = useState<Staff | null>(null);
  const [adding, setAdding] = useState(false);
  const { confirm, dialog } = useConfirm();
  const save = useAction((v: { id?: string; data: Record<string, unknown> }) => (v.id ? staffApi.update(v.id, v.data) : staffApi.create(v.data)), "Staff saved");
  const del = useAction((id: string) => staffApi.remove(id), "Staff record removed");
  const roles = ["Administrator", "Security Officer", "Cleaner", "Maintenance Technician", "Manager"];
  return (
    <QueryGate queries={[staff]}>
      <PageHeader title="Staff" description="Hostel employees and their roles." actions={<><DemoBadge />{can("staff:create") && <Button onClick={() => setAdding(true)}><Plus /> Add staff</Button>}</>} />
      <DataTable data={staff.data ?? []} rowKey={(s) => s.id} exportName="staff" dateField={(s) => s.joinedAt} onRowClick={can("staff:update") ? setEdit : undefined}
        filters={[{ key: "role", label: "Roles", options: roles, value: (s) => s.role }, { key: "st", label: "Statuses", options: ["Active", "On Leave", "Terminated"], value: (s) => s.status }]}
        columns={[
          { key: "fullName", header: "Name", cell: (s) => <div className="flex items-center gap-2.5"><div className="grid size-8 place-items-center rounded-full bg-accent/20 text-[11px] font-semibold text-accent">{initials(s.fullName)}</div><div><p className="font-medium">{s.fullName}</p><p className="font-mono text-[10px] text-subtle">{s.id}</p></div></div> },
          { key: "role", header: "Role" }, { key: "department", header: "Department", hideOnMobile: true },
          { key: "phone", header: "Phone", hideOnMobile: true }, { key: "email", header: "Email", hideOnMobile: true },
          { key: "joinedAt", header: "Joined", cell: (s) => d(s.joinedAt) }, { key: "status", header: "Status", cell: (s) => <StatusBadge value={s.status} /> },
          { key: "act", header: "", value: () => "", cell: (s) => can("staff:delete") ? <Button size="sm" variant="ghost" className="text-destructive" onClick={(e) => { e.stopPropagation(); confirm({ title: `Remove ${s.fullName}?`, message: "This permanently deletes the staff record.", action: "Remove", danger: true, onConfirm: () => del.mutate(s.id) }); }}>Remove</Button> : null },
        ]} />
      <FormDialog open={adding || !!edit} onOpenChange={(o) => { if (!o) { setAdding(false); setEdit(null); } }} title={edit ? `Edit ${edit.fullName}` : "Add staff"} schema={staffSchema}
        initial={edit ?? { fullName: "", phone: "", email: "", role: "Security Officer", department: "Security", status: "Active" }}
        fields={[{ name: "fullName", label: "Full name" }, { name: "email", label: "Email", type: "email" }, { name: "phone", label: "Phone" }, { name: "role", label: "Role", type: "select", options: roles }, { name: "department", label: "Department" }, { name: "status", label: "Employment status", type: "select", options: ["Active", "On Leave", "Terminated"] }]}
        onSubmit={(data) => save.mutateAsync({ id: edit?.id, data })} />
      {dialog}
    </QueryGate>
  );
}

// --------------------------------------------------------- ANNOUNCEMENTS
export function AnnouncementsPage() {
  const ann = useAnnouncements();
  const { can } = useAuth();
  const [adding, setAdding] = useState(false);
  const [showExpired, setShowExpired] = useState(false);
  const { confirm, dialog } = useConfirm();
  const create = useAction((data: Record<string, unknown>) => announcementsApi.create(data), "Announcement published");
  const del = useAction((id: string) => announcementsApi.remove(id), "Announcement removed");
  const today = new Date().toISOString().slice(0, 10);
  const rows = (ann.data ?? []).filter((a) => showExpired || a.expiresAt >= today).sort((a, b) => b.publishedAt.localeCompare(a.publishedAt));
  const tone = (c: string) => (c === "Emergency" ? "danger" : c === "Security" ? "warning" : c === "Payment" ? "info" : "muted") as "danger";
  return (
    <QueryGate queries={[ann]}>
      <PageHeader title="Announcements" description="Hostel-wide notices." actions={<>
        {can("announcements:update") && <Button variant="outline" size="sm" onClick={() => setShowExpired(!showExpired)}>{showExpired ? "Hide expired" : "Show expired"}</Button>}
        {can("announcements:create") && <Button onClick={() => setAdding(true)}><Megaphone /> Publish</Button>}</>} />
      {rows.length ? (
        <div className="grid gap-3 lg:grid-cols-2">
          {rows.map((a) => (
            <article key={a.id} className={cn("glass p-4", a.priority === "Critical" && "ring-2 ring-destructive/50")}>
              <div className="flex items-start justify-between gap-2"><h2 className="font-semibold">{a.title}</h2><div className="flex gap-1"><StatusBadge value={a.category} tone={tone(a.category)} />{a.priority !== "Normal" && <StatusBadge value={a.priority} />}</div></div>
              <p className="mt-2 text-sm text-muted-foreground">{a.message}</p>
              <div className="mt-3 flex items-center justify-between text-[11px] text-subtle">
                <span>{a.publishedBy} · {d(a.publishedAt)} · expires {d(a.expiresAt)}{a.expiresAt < today && " (expired)"}</span>
                {can("announcements:delete") && <button className="text-destructive hover:underline" onClick={() => confirm({ title: "Delete announcement?", message: a.title, action: "Delete", danger: true, onConfirm: () => del.mutate(a.id) })}>Delete</button>}
              </div>
            </article>
          ))}
        </div>
      ) : <EmptyState title="No active announcements" />}
      <FormDialog open={adding} onOpenChange={setAdding} title="Publish announcement" schema={announcementSchema} submitLabel="Publish"
        initial={{ title: "", message: "", category: "General", priority: "Normal", expiresAt: new Date(Date.now() + 14 * 86400000).toISOString().slice(0, 10) }}
        fields={[{ name: "title", label: "Title", full: true }, { name: "category", label: "Category", type: "select", options: ["General", "Security", "Maintenance", "Emergency", "Payment"] }, { name: "priority", label: "Priority", type: "select", options: ["Normal", "High", "Critical"] }, { name: "expiresAt", label: "Expiry date", type: "date" }, { name: "message", label: "Message", type: "textarea" }]}
        onSubmit={(data) => create.mutateAsync(data)} />
      {dialog}
    </QueryGate>
  );
}

// --------------------------------------------------------- NOTIFICATIONS
export function NotificationsPage() {
  const n = useNotifications();
  const { user } = useAuth();
  const [filter, setFilter] = useState("");
  const read = useAction((id: string) => notificationsApi.markRead(id));
  const all = useAction(() => notificationsApi.markAllRead(), "All notifications marked as read");
  const rows = (n.data ?? []).filter((x) => !filter || x.type === filter).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const unread = (n.data ?? []).filter((x) => user && !x.readBy.includes(user.id)).length;
  return (
    <QueryGate queries={[n]}>
      <PageHeader title="Notifications" description={`${unread} unread`} actions={<>
        <select aria-label="Filter by type" className="field h-9 w-auto" value={filter} onChange={(e) => setFilter(e.target.value)}>
          <option value="">All types</option>{["Visitor Approval", "Visitor Arrival", "Visitor Checkout", "Incident Alert", "Maintenance Update", "Payment Reminder", "Announcement", "Security Alert"].map((t) => <option key={t}>{t}</option>)}
        </select>
        <Button variant="outline" size="sm" disabled={!unread} onClick={() => all.mutate(undefined)}><CheckCheck /> Mark all read</Button></>} />
      {rows.length ? (
        <ul className="space-y-2">
          {rows.map((x) => {
            const isUnread = user && !x.readBy.includes(user.id);
            return (
              <li key={x.id}>
                <button onClick={() => isUnread && read.mutate(x.id)} className={cn("glass flex w-full items-start gap-3 p-4 text-left", isUnread && "ring-1 ring-primary/50")}>
                  <span className={cn("mt-1 grid size-8 shrink-0 place-items-center rounded-full", x.type.includes("Alert") ? "bg-destructive/20 text-destructive" : "bg-primary/20 text-primary")}><Bell className="size-4" aria-hidden /></span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-2"><span className="font-medium">{x.title}</span>{isUnread && <span className="size-2 rounded-full bg-primary" aria-label="Unread" />}</span>
                    <span className="block text-sm text-muted-foreground">{x.message}</span>
                    <span className="mt-1 block font-mono text-[10px] text-subtle">{x.type} · {ago(x.createdAt)}</span>
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      ) : <EmptyState title="You're all caught up" />}
    </QueryGate>
  );
}

export const OutstandingPage = () => <PaymentsPage outstandingOnly />;
export const MyPaymentsPage = () => <PaymentsPage mine />;
