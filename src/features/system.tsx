import { useMemo, useState } from "react";
import { FileText, KeyRound, Lock, Plus, Printer, RotateCcw, ShieldCheck, Unlock, UserX } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DataTable } from "@/components/app/data-table";
import { FormDialog, FormFields, useZodForm } from "@/components/app/form-dialog";
import { DemoBadge, EmptyState, PageHeader, Panel, QueryGate, StatCard, StatusBadge, useConfirm } from "@/components/app/ui-kit";
import { useAccessLogs, useAction, useAuditLogs, useIncidents, useLoginAttempts, useMaintenance, usePayments, useSettings, useStaff, useUsers, useVisitors } from "@/lib/api/hooks";
import { authApi, settingsApi, usersApi } from "@/lib/api/services";
import { useAuth } from "@/lib/auth/auth-context";
import { ROLE_LABEL } from "@/lib/auth/permissions";
import { changePasswordSchema, settingsSchema, userSchema } from "@/lib/validation";
import { d, downloadCsv, dt, kes } from "@/lib/format";
import { resetMockDb } from "@/lib/mock/server";
import { USING_MOCK_API } from "@/lib/api/http";
import type { Role, User } from "@/lib/types";
import { useLookups } from "./shared";

// ------------------------------------------------------------ AUDIT LOGS
export function AuditPage() {
  const logs = useAuditLogs();
  const { can } = useAuth();
  const attempts = useLoginAttempts();
  const L = logs.data ?? [];
  return (
    <QueryGate queries={[logs]}>
      <PageHeader title="Audit Logs" description="Immutable record of security-relevant actions. Entries cannot be edited or deleted." actions={<span className="inline-flex items-center gap-1 rounded-full bg-secondary px-3 py-1 text-xs text-muted-foreground"><Lock className="size-3" /> Read-only</span>} />
      <div className="mb-4 grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatCard label="Entries" value={L.length} />
        <StatCard label="Today" value={L.filter((l) => l.timestamp.slice(0, 10) === new Date().toISOString().slice(0, 10)).length} />
        <StatCard label="Failures" value={L.filter((l) => l.result === "Failure").length} tone="warning" />
        <StatCard label="Permission denied" value={L.filter((l) => l.result === "Denied").length} tone="danger" />
      </div>
      <DataTable data={L} rowKey={(l) => l.id} exportName="audit-logs" dateField={(l) => l.timestamp} pageSize={15} searchPlaceholder="Search description, user, action…"
        filters={[
          { key: "user", label: "Users", options: [...new Set(L.map((l) => l.user))].sort(), value: (l) => l.user },
          { key: "action", label: "Actions", options: [...new Set(L.map((l) => l.action))].sort(), value: (l) => l.action },
          { key: "module", label: "Modules", options: [...new Set(L.map((l) => l.module))].sort(), value: (l) => l.module },
          { key: "result", label: "Results", options: ["Success", "Failure", "Denied"], value: (l) => l.result },
        ]}
        columns={[
          { key: "timestamp", header: "Timestamp", cell: (l) => <span className="font-mono text-xs">{dt(l.timestamp)}</span> },
          { key: "user", header: "User", cell: (l) => <div><p>{l.user}</p><p className="text-[10px] text-subtle">{l.role === "SYSTEM" ? "System" : ROLE_LABEL[l.role]}</p></div> },
          { key: "action", header: "Action", cell: (l) => <span className="font-mono text-xs">{l.action}</span> },
          { key: "module", header: "Module" },
          { key: "description", header: "Description", cell: (l) => <span className="line-clamp-2 max-w-md">{l.description}</span> },
          { key: "ip", header: "IP", hideOnMobile: true, cell: (l) => <span className="font-mono text-[11px]">{l.ip}</span> },
          { key: "device", header: "Device", hideOnMobile: true, cell: (l) => <span className="text-[11px] text-muted-foreground">{l.device}</span> },
          { key: "result", header: "Result", cell: (l) => <StatusBadge value={l.result} /> },
        ]} />
      {can("users:read") && (
        <div className="mt-6">
          <h2 className="mb-2 text-sm font-semibold">Login attempts</h2>
          <DataTable data={attempts.data ?? []} rowKey={(a) => a.id} exportName="login-attempts" dateField={(a) => a.timestamp}
            filters={[{ key: "ok", label: "Outcomes", options: ["Success", "Failure"], value: (a) => (a.success ? "Success" : "Failure") }]}
            columns={[{ key: "timestamp", header: "Time", cell: (a) => <span className="font-mono text-xs">{dt(a.timestamp)}</span> }, { key: "email", header: "Account" }, { key: "reason", header: "Reason" }, { key: "ip", header: "IP" }, { key: "success", header: "Outcome", cell: (a) => <StatusBadge value={a.success ? "Success" : "Failure"} /> }]} />
        </div>
      )}
    </QueryGate>
  );
}

// ----------------------------------------------------------------- USERS
export function UsersPage() {
  const users = useUsers();
  const audit = useAuditLogs();
  const { user: me } = useAuth();
  const [edit, setEdit] = useState<User | null>(null);
  const [adding, setAdding] = useState(false);
  const [activity, setActivity] = useState<User | null>(null);
  const [temp, setTemp] = useState<{ name: string; pw: string } | null>(null);
  const { confirm, dialog } = useConfirm();
  const save = useAction(async (v: { id?: string; data: Record<string, unknown> }) => {
    const r = v.id ? await usersApi.update(v.id, v.data) : await usersApi.create(v.data);
    if (r.temporaryPassword) setTemp({ name: r.fullName, pw: r.temporaryPassword });
    return r;
  }, "User saved");
  const reset = useAction(async (u: User) => { const r = await usersApi.resetPassword(u.id); setTemp({ name: u.fullName, pw: r.temporaryPassword }); return r; }, "Password reset");
  const revoke = useAction((id: string) => usersApi.remove(id), "Access revoked");
  const unlock = useAction((id: string) => usersApi.unlock(id), "Account unlocked");
  const status = useAction((u: User) => usersApi.update(u.id, { ...u, status: u.status === "Active" ? "Suspended" : "Active" }), "Status updated");
  const roles: Role[] = ["SUPER_ADMIN", "HOSTEL_ADMIN", "SECURITY_OFFICER", "RESIDENT"];
  return (
    <QueryGate queries={[users]}>
      <PageHeader title="User Management" description="Accounts, roles and access. Changes are audited." actions={<Button onClick={() => setAdding(true)}><Plus /> Create user</Button>} />
      <DataTable data={users.data ?? []} rowKey={(u) => u.id} exportName="users" dateField={(u) => u.createdAt}
        filters={[{ key: "role", label: "Roles", options: roles.map((r) => ROLE_LABEL[r]), value: (u) => ROLE_LABEL[u.role] }, { key: "st", label: "Statuses", options: ["Active", "Suspended", "Disabled"], value: (u) => u.status }]}
        columns={[
          { key: "fullName", header: "User", cell: (u) => <div><p className="font-medium">{u.fullName}{u.id === me?.id && <span className="ml-1 text-[10px] text-primary">(you)</span>}</p><p className="text-[11px] text-subtle">{u.email} · @{u.username}</p></div>, value: (u) => `${u.fullName} ${u.email} ${u.username}` },
          { key: "role", header: "Role", value: (u) => ROLE_LABEL[u.role] }, { key: "phone", header: "Phone", hideOnMobile: true },
          { key: "lastLogin", header: "Last login", hideOnMobile: true, value: (u) => u.lastLogin ?? "", cell: (u) => <span className="font-mono text-xs">{u.lastLogin ? dt(u.lastLogin) : "Never"}</span> },
          { key: "createdAt", header: "Created", hideOnMobile: true, cell: (u) => d(u.createdAt) },
          { key: "status", header: "Status", cell: (u) => <div className="flex gap-1"><StatusBadge value={u.status} />{u.lockedUntil && new Date(u.lockedUntil) > new Date() && <StatusBadge value="Locked" tone="danger" />}</div> },
          { key: "act", header: "", value: () => "", cell: (u) => (
            <div className="flex justify-end gap-1">
              <Button size="sm" variant="ghost" onClick={() => setEdit(u)}>Edit</Button>
              <Button size="sm" variant="ghost" onClick={() => setActivity(u)}>Activity</Button>
              {u.id !== me?.id && <>
                <Button size="icon" variant="ghost" aria-label="Reset password" onClick={() => confirm({ title: `Reset password for ${u.fullName}?`, message: "A temporary password will be generated. The user must change it on next login.", action: "Reset", onConfirm: () => reset.mutate(u) })}><RotateCcw /></Button>
                {u.lockedUntil && <Button size="icon" variant="ghost" aria-label="Unlock" onClick={() => unlock.mutate(u.id)}><Unlock /></Button>}
                {u.status !== "Disabled" && <Button size="icon" variant="ghost" aria-label={u.status === "Active" ? "Suspend" : "Activate"} onClick={() => status.mutate(u)}>{u.status === "Active" ? <Lock /> : <ShieldCheck />}</Button>}
                {u.status !== "Disabled" && <Button size="icon" variant="ghost" aria-label="Revoke access" onClick={() => confirm({ title: `Revoke access for ${u.fullName}?`, message: "The account will be disabled and all sessions invalidated.", action: "Revoke", danger: true, onConfirm: () => revoke.mutate(u.id) })}><UserX className="text-destructive" /></Button>}
                {u.status === "Disabled" && <Button size="sm" variant="outline" onClick={() => status.mutate({ ...u, status: "Suspended" })}>Activate</Button>}
              </>}
            </div>) },
        ]} />
      <FormDialog open={adding || !!edit} onOpenChange={(o) => { if (!o) { setAdding(false); setEdit(null); } }} title={edit ? `Edit ${edit.fullName}` : "Create user"} schema={userSchema}
        description={edit ? "Role changes take effect on the user's next request." : "A temporary password is generated and shown once."}
        initial={edit ?? { fullName: "", email: "", phone: "", username: "", role: "SECURITY_OFFICER", status: "Active" }}
        fields={[{ name: "fullName", label: "Full name" }, { name: "username", label: "Username" }, { name: "email", label: "Email", type: "email" }, { name: "phone", label: "Phone" }, { name: "role", label: "Role", type: "select", options: roles.map((r) => ({ value: r, label: ROLE_LABEL[r] })) }, { name: "status", label: "Status", type: "select", options: ["Active", "Suspended", "Disabled"] }]}
        onSubmit={(data) => save.mutateAsync({ id: edit?.id, data })} />
      <Dialog open={!!temp} onOpenChange={(o) => !o && setTemp(null)}>
        <DialogContent><DialogHeader><DialogTitle>Temporary password</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">Share securely with {temp?.name}. It will not be shown again.</p>
          <code className="rounded-lg bg-secondary p-3 text-center font-mono text-lg">{temp?.pw}</code>
          <Button onClick={() => { navigator.clipboard?.writeText(temp?.pw ?? ""); toast.success("Copied"); }}>Copy</Button>
        </DialogContent>
      </Dialog>
      <Dialog open={!!activity} onOpenChange={(o) => !o && setActivity(null)}>
        <DialogContent className="max-h-[80vh] overflow-y-auto"><DialogHeader><DialogTitle>Activity — {activity?.fullName}</DialogTitle></DialogHeader>
          {(() => { const xs = (audit.data ?? []).filter((l) => l.userId === activity?.id); return xs.length ? <ul className="divide-y divide-border">{xs.slice(0, 30).map((l) => <li key={l.id} className="py-2 text-[13px]"><p>{l.description}</p><p className="font-mono text-[10px] text-subtle">{dt(l.timestamp)} · {l.action} · {l.result}</p></li>)}</ul> : <EmptyState title="No recorded activity" />; })()}
        </DialogContent>
      </Dialog>
      {dialog}
    </QueryGate>
  );
}

// -------------------------------------------------------------- SETTINGS
export function SettingsPage() {
  const s = useSettings();
  return (
    <QueryGate queries={[s]}>
      <PageHeader title="Security Settings" description="System-wide security policy. Only Super Admins can change these." />
      {s.data && <SettingsForm initial={s.data as unknown as Record<string, unknown>} />}
      <Panel title="Security architecture" className="mt-5">
        <ul className="grid gap-2 text-sm text-muted-foreground sm:grid-cols-2">
          {["JWT bearer tokens with expiry; 401 forces re-login", "BCrypt password hashing on the server (never stored in plain text)", "Role-based access control enforced on every API call (least privilege)", "Login attempt tracking and automatic account lockout", "Account status checks: Active / Suspended / Disabled", "Immutable audit log for every write and denied action", "Shared input validation on client and server", "No sensitive data in URLs; record IDs only", "Confirmation dialogs for destructive actions", "CSV export guarded against formula injection"].map((x) => <li key={x} className="flex gap-2"><ShieldCheck className="mt-0.5 size-4 shrink-0 text-success" aria-hidden />{x}</li>)}
        </ul>
      </Panel>
      {USING_MOCK_API && (
        <Panel title="Demo data" className="mt-5">
          <p className="mb-3 text-sm text-muted-foreground">This app is running on built-in sample data stored in your browser. Reset to restore the original demo records.</p>
          <Button variant="outline" onClick={() => { resetMockDb(); localStorage.clear(); sessionStorage.clear(); window.location.assign("/login"); }}><RotateCcw /> Reset demo data</Button>
        </Panel>
      )}
    </QueryGate>
  );
}
function SettingsForm({ initial }: { initial: Record<string, unknown> }) {
  const form = useZodForm(settingsSchema, Object.fromEntries(Object.entries(initial).map(([k, v]) => [k, typeof v === "number" ? String(v) : v])));
  const save = useAction((data: Record<string, unknown>) => settingsApi.update(data), "Security settings saved");
  return (
    <Panel>
      <form noValidate className="space-y-5" onSubmit={async (e) => { e.preventDefault(); await form.submit((d) => save.mutateAsync(d)); }}>
        <FormFields values={form.values} errors={form.errors} onChange={form.onChange} fields={[
          { name: "sessionTimeoutMinutes", label: "Session timeout (minutes)", type: "number" }, { name: "maxLoginAttempts", label: "Max failed logins before lockout", type: "number" },
          { name: "lockoutMinutes", label: "Lockout duration (minutes)", type: "number" }, { name: "passwordMinLength", label: "Minimum password length", type: "number" },
          { name: "visitorMaxHours", label: "Max visitor stay (hours)", type: "number" }, { name: "curfewTime", label: "Curfew time", type: "time" },
          { name: "auditRetentionDays", label: "Audit log retention (days)", type: "number" }, { name: "requireMfaForAdmins", label: "Require MFA for administrators (requires backend support)", type: "checkbox" },
        ]} />
        <div className="flex justify-end"><Button type="submit" disabled={form.busy}>Save settings</Button></div>
      </form>
    </Panel>
  );
}

// --------------------------------------------------------------- ACCOUNT
export function AccountPage() {
  const { user } = useAuth();
  const form = useZodForm(changePasswordSchema, { currentPassword: "", newPassword: "", confirm: "" });
  const change = useAction((d: Record<string, unknown>) => authApi.changePassword(d as { currentPassword: string; newPassword: string; confirm: string }), "Password changed");
  return (
    <>
      <PageHeader title="Account & password" description={`${user?.fullName} · ${user?.email}`} />
      <Panel title="Change password" className="max-w-xl">
        <form noValidate className="space-y-4" onSubmit={async (e) => { e.preventDefault(); if (await form.submit((d) => change.mutateAsync(d))) form.reset(); }}>
          <FormFields values={form.values} errors={form.errors} onChange={form.onChange} fields={[
            { name: "currentPassword", label: "Current password", type: "password", full: true },
            { name: "newPassword", label: "New password", type: "password", help: "10+ chars with upper, lower, number and symbol" },
            { name: "confirm", label: "Confirm new password", type: "password" },
          ]} />
          <div className="flex justify-end"><Button type="submit" disabled={form.busy}><KeyRound /> Update password</Button></div>
        </form>
      </Panel>
    </>
  );
}

// --------------------------------------------------------------- REPORTS
type ReportDef = { name: string; build: () => Record<string, unknown>[] };
export function ReportsPage() {
  const L = useLookups();
  const payments = usePayments();
  const visitors = useVisitors();
  const incidents = useIncidents();
  const access = useAccessLogs();
  const maintenance = useMaintenance();
  const audit = useAuditLogs();
  const attempts = useLoginAttempts();
  const staff = useStaff();
  const { can } = useAuth();
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [preview, setPreview] = useState<{ name: string; rows: Record<string, unknown>[] } | null>(null);
  const inRange = (iso?: string | null) => { const v = iso?.slice(0, 10); return !v || ((!from || v >= from) && (!to || v <= to)); };
  const count = <T,>(xs: T[], k: (x: T) => string) => Object.entries(xs.reduce<Record<string, number>>((a, x) => ({ ...a, [k(x)]: (a[k(x)] ?? 0) + 1 }), {})).map(([key, n]) => ({ Group: key, Count: n }));

  const groups: { title: string; reports: ReportDef[] }[] = useMemo(() => [
    { title: "Resident reports", reports: [
      { name: "Resident list", build: () => L.residents.filter((r) => inRange(r.registeredAt)).map((r) => ({ ID: r.id, Name: r.fullName, Admission: r.admissionNo, Course: r.course, Year: r.yearOfStudy, Room: L.roomNo(r.roomId), Status: r.status })) },
      { name: "Residents by room", build: () => L.rooms.map((rm) => ({ Room: rm.number, Type: rm.type, Residents: L.beds.filter((b) => b.roomId === rm.id && b.residentId).map((b) => L.residentName(b.residentId)).join("; ") })) },
      { name: "Residents by course", build: () => count(L.residents, (r) => r.course) },
      { name: "Residents by year", build: () => count(L.residents, (r) => `Year ${r.yearOfStudy}`) },
      { name: "Occupancy report", build: () => L.rooms.map((rm) => { const bs = L.beds.filter((b) => b.roomId === rm.id); return { Room: rm.number, Block: rm.block, Capacity: rm.capacity, Occupied: bs.filter((b) => b.status === "Occupied").length, Status: rm.status }; }) },
    ] },
    { title: "Security reports", reports: [
      { name: "Incident report", build: () => (incidents.data ?? []).filter((i) => inRange(i.occurredAt)).map((i) => ({ Number: i.number, Type: i.type, Date: dt(i.occurredAt), Location: i.location, Severity: i.severity, Status: i.status, Officer: i.assignedOfficer ?? "" })) },
      { name: "Visitor report", build: () => (visitors.data ?? []).filter((v) => inRange(v.createdAt)).map((v) => ({ ID: v.id, Visitor: v.fullName, Resident: L.residentName(v.residentId), In: dt(v.checkIn), Out: dt(v.checkOut), Status: v.status })) },
      { name: "Access control report", build: () => (access.data ?? []).filter((a) => inRange(a.entryTime)).map((a) => ({ Person: a.person, Type: a.personType, Gate: a.gate, Entry: dt(a.entryTime), Exit: dt(a.exitTime), Status: a.status, Officer: a.officer })) },
      { name: "Security officer activity", build: () => (staff.data ?? []).filter((s) => s.role === "Security Officer").map((s) => ({ Officer: s.fullName, "Gate actions": (access.data ?? []).filter((a) => a.officer === s.fullName && inRange(a.entryTime)).length, "Incidents assigned": (incidents.data ?? []).filter((i) => i.assignedOfficer === s.fullName).length })) },
      { name: "Incident severity report", build: () => count((incidents.data ?? []).filter((i) => inRange(i.occurredAt)), (i) => i.severity) },
    ] },
    { title: "Financial reports", reports: [
      { name: "Payment report", build: () => (payments.data ?? []).filter((p) => inRange(p.paidAt ?? p.dueDate)).map((p) => ({ ID: p.id, Resident: L.residentName(p.residentId), Period: p.period, Paid: p.amountPaid, Due: p.amountDue, Method: p.method ?? "", Ref: p.reference, Status: p.status })) },
      { name: "Outstanding balances", build: () => (payments.data ?? []).filter((p) => p.status !== "Paid").map((p) => ({ Resident: L.residentName(p.residentId), Period: p.period, Balance: p.amountDue - p.amountPaid, Status: p.status })) },
      { name: "Monthly revenue", build: () => [...new Set((payments.data ?? []).map((p) => p.period))].sort().map((m) => { const ps = (payments.data ?? []).filter((p) => p.period === m); return { Month: m, Expected: kes(ps.reduce((a, p) => a + p.amountDue, 0)), Collected: kes(ps.reduce((a, p) => a + p.amountPaid, 0)) }; }) },
      { name: "Overdue payments", build: () => (payments.data ?? []).filter((p) => p.status === "Overdue").map((p) => ({ Resident: L.residentName(p.residentId), Phone: L.resident(p.residentId)?.phone ?? "", Period: p.period, Balance: p.amountDue - p.amountPaid })) },
    ] },
    { title: "Maintenance reports", reports: [
      { name: "Open maintenance requests", build: () => (maintenance.data ?? []).filter((m) => !["Completed", "Cancelled"].includes(m.status)).map((m) => ({ ID: m.id, Room: L.roomNo(m.roomId), Category: m.category, Priority: m.priority, Status: m.status, Technician: m.technician ?? "" })) },
      { name: "Completed requests", build: () => (maintenance.data ?? []).filter((m) => m.status === "Completed" && inRange(m.createdAt)).map((m) => ({ ID: m.id, Category: m.category, Technician: m.technician ?? "", Date: d(m.createdAt) })) },
      { name: "Requests by category", build: () => count(maintenance.data ?? [], (m) => m.category) },
      { name: "Technician performance", build: () => [...new Set((maintenance.data ?? []).map((m) => m.technician).filter(Boolean))].map((t) => { const ms = (maintenance.data ?? []).filter((m) => m.technician === t); return { Technician: t, Assigned: ms.length, Completed: ms.filter((m) => m.status === "Completed").length }; }) },
    ] },
    ...(can("audit:read") ? [{ title: "System reports", reports: [
      { name: "User activity", build: () => count((audit.data ?? []).filter((l) => inRange(l.timestamp)), (l) => l.user) },
      { name: "Audit logs", build: () => (audit.data ?? []).filter((l) => inRange(l.timestamp)).map((l) => ({ Time: dt(l.timestamp), User: l.user, Action: l.action, Module: l.module, Description: l.description, Result: l.result })) },
      { name: "Login activity", build: () => (attempts.data ?? []).filter((a) => inRange(a.timestamp)).map((a) => ({ Time: dt(a.timestamp), Account: a.email, Outcome: a.success ? "Success" : "Failure", Reason: a.reason })) },
    ] }] : []),
  // eslint-disable-next-line react-hooks/exhaustive-deps
  ], [L, payments.data, visitors.data, incidents.data, access.data, maintenance.data, audit.data, attempts.data, staff.data, from, to]);

  return (
    <QueryGate queries={[...L.queries, payments, visitors, incidents, access, maintenance]}>
      <PageHeader title="Reports" description="Generate, preview, export or print operational reports." actions={<DemoBadge />} />
      <Panel className="mb-4">
        <div className="flex flex-wrap items-end gap-3">
          <label className="text-xs text-muted-foreground">From<input type="date" className="field mt-1 w-auto" value={from} onChange={(e) => setFrom(e.target.value)} /></label>
          <label className="text-xs text-muted-foreground">To<input type="date" className="field mt-1 w-auto" value={to} onChange={(e) => setTo(e.target.value)} /></label>
          {(from || to) && <Button variant="ghost" size="sm" onClick={() => { setFrom(""); setTo(""); }}>Clear dates</Button>}
        </div>
      </Panel>
      <div className="grid gap-4 lg:grid-cols-2">
        {groups.map((g) => (
          <Panel key={g.title} title={g.title}>
            <ul className="divide-y divide-border">
              {g.reports.map((r) => (
                <li key={r.name} className="flex flex-wrap items-center justify-between gap-2 py-2">
                  <span className="flex items-center gap-2 text-sm"><FileText className="size-4 text-subtle" aria-hidden />{r.name}</span>
                  <div className="flex gap-1">
                    <Button size="sm" variant="ghost" onClick={() => setPreview({ name: r.name, rows: r.build() })}>Preview</Button>
                    <Button size="sm" variant="ghost" onClick={() => downloadCsv(r.name.toLowerCase().replace(/\s+/g, "-"), r.build())}>CSV</Button>
                    <Button size="sm" variant="ghost" onClick={() => toast.info("PDF export will be generated by the reporting API (GET /api/reports?format=pdf).")}>PDF</Button>
                  </div>
                </li>
              ))}
            </ul>
          </Panel>
        ))}
      </div>
      <Dialog open={!!preview} onOpenChange={(o) => !o && setPreview(null)}>
        <DialogContent className="max-h-[90vh] max-w-5xl overflow-auto">
          <DialogHeader><DialogTitle>{preview?.name}</DialogTitle></DialogHeader>
          <p className="text-xs text-muted-foreground">Lala Salama · generated {dt(new Date().toISOString())}{from || to ? ` · ${from || "…"} to ${to || "…"}` : ""} · {preview?.rows.length} rows</p>
          {preview?.rows.length ? (
            <div className="overflow-x-auto"><table className="w-full text-xs"><thead><tr className="border-b border-border text-left text-subtle">{Object.keys(preview.rows[0]).map((k) => <th key={k} className="px-2 py-1.5">{k}</th>)}</tr></thead>
              <tbody>{preview.rows.slice(0, 200).map((r, i) => <tr key={i} className="border-b border-border/50">{Object.values(r).map((v, j) => <td key={j} className="px-2 py-1.5">{String(v)}</td>)}</tr>)}</tbody></table></div>
          ) : <EmptyState title="No data for this range" />}
          <div className="flex justify-end gap-2 no-print">
            <Button variant="outline" onClick={() => preview && downloadCsv(preview.name, preview.rows)}>Export CSV</Button>
            <Button onClick={() => window.print()}><Printer /> Print</Button>
          </div>
        </DialogContent>
      </Dialog>
    </QueryGate>
  );
}
