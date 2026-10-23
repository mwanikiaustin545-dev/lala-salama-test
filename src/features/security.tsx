import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Ban, Check, DoorOpen, Flag, LogIn, LogOut, Phone, Plus, Printer, Siren, Ticket, Upload, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DataTable } from "@/components/app/data-table";
import { FormDialog, FormFields, useZodForm } from "@/components/app/form-dialog";
import { DemoBadge, EmptyState, KV, PageHeader, Panel, QueryGate, StatCard, StatusBadge, useConfirm } from "@/components/app/ui-kit";
import { VisitorPass } from "@/components/app/visitor-pass";
import { useAccessLogs, useAction, useEmergency, useIncidents, useLostFound, useVisitors } from "@/lib/api/hooks";
import { accessApi, emergencyApi, incidentsApi, lostFoundApi, visitorsApi } from "@/lib/api/services";
import { useAuth } from "@/lib/auth/auth-context";
import { accessSchema, emergencyAlertSchema, incidentSchema, incidentUpdateSchema, lostFoundSchema, visitorSchema } from "@/lib/validation";
import { d, dt, tm } from "@/lib/format";
import type { Incident, Visitor } from "@/lib/types";
import { useArea, useLookups } from "./shared";
import { VisitorsInside } from "./dashboards";

const isoLocal = (ms: number) => new Date(ms - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 16);

// ------------------------------------------------------------- VISITORS
export function VisitorsPage() {
  const L = useLookups();
  const visitors = useVisitors();
  const { can, role } = useAuth();
  const [adding, setAdding] = useState(false);
  const [pass, setPass] = useState<Visitor | null>(null);
  const { confirm, dialog } = useConfirm();
  const act = useAction((v: { id: string; a: Parameters<typeof visitorsApi.action>[1] }) => visitorsApi.action(v.id, v.a), (v) => `${v.fullName}: ${v.status}`);
  const create = useAction((data: Record<string, unknown>) => visitorsApi.create(data), (v) => (v.status === "Denied" ? `${v.fullName} matches a blacklisted ID — denied` : "Visitor registered — awaiting approval"));
  const isResident = role === "RESIDENT";
  const V = visitors.data ?? [];

  return (
    <QueryGate queries={[...L.queries, visitors]}>
      <PageHeader title={isResident ? "My Visitors" : "Visitor Management"} description={isResident ? "Request access for guests and view your visitor history." : "Register, verify, approve and check visitors in and out."}
        actions={<><DemoBadge />{can("visitors:create") && <Button onClick={() => setAdding(true)}><Plus /> {isResident ? "Request visitor access" : "Register visitor"}</Button>}</>} />
      {!isResident && (
        <>
          <div className="mb-4 grid grid-cols-2 gap-3 md:grid-cols-4">
            <StatCard label="Inside now" value={V.filter((v) => v.status === "Checked In").length} tone="info" />
            <StatCard label="Pending approval" value={V.filter((v) => v.status === "Pending").length} tone="warning" />
            <StatCard label="Approved (awaiting arrival)" value={V.filter((v) => v.status === "Approved").length} />
            <StatCard label="Blacklisted" value={V.filter((v) => v.status === "Blacklisted").length} tone="danger" />
          </div>
          <Panel title="Currently Inside Hostel" className="mb-5"><VisitorsInside visitors={V} /></Panel>
        </>
      )}
      <DataTable data={V} rowKey={(v) => v.id} exportName="visitors" dateField={(v) => v.checkIn ?? v.createdAt}
        searchPlaceholder="Search name, ID number, phone, pass…"
        filters={[{ key: "status", label: "Statuses", options: ["Pending", "Approved", "Checked In", "Checked Out", "Denied", "Blacklisted"], value: (v) => v.status }]}
        columns={[
          { key: "fullName", header: "Visitor", cell: (v) => <div><p className="font-medium">{v.fullName} {v.flagged && <Flag className="inline size-3 text-destructive" aria-label="Flagged" />}</p><p className="font-mono text-[10px] text-subtle">{v.id} · {v.idType} {v.idNumber}</p></div>, value: (v) => `${v.fullName} ${v.idNumber} ${v.phone} ${v.passNo ?? ""}` },
          { key: "res", header: "Resident", value: (v) => `${L.residentName(v.residentId)}`, hideOnMobile: isResident },
          { key: "purpose", header: "Purpose", hideOnMobile: true },
          { key: "checkIn", header: "Check-in", value: (v) => v.checkIn ?? "", cell: (v) => <span className="font-mono text-xs">{v.checkIn ? dt(v.checkIn) : "—"}</span> },
          { key: "checkOut", header: "Check-out", hideOnMobile: true, value: (v) => v.checkOut ?? "", cell: (v) => <span className="font-mono text-xs">{v.checkOut ? tm(v.checkOut) : `exp. ${tm(v.expectedCheckOut)}`}</span> },
          { key: "officer", header: "Officer", hideOnMobile: true, value: (v) => v.officer ?? "—" },
          { key: "status", header: "Status", cell: (v) => <StatusBadge value={v.status} /> },
          { key: "act", header: "", value: () => "", cell: (v) => (
            <div className="flex flex-wrap justify-end gap-1">
              {v.passNo && <Button size="sm" variant="ghost" onClick={() => setPass(v)} aria-label="View pass"><Ticket /></Button>}
              {can("visitors:update") && (
                <>
                  {v.status === "Pending" && <><Button size="sm" variant="outline" onClick={() => act.mutate({ id: v.id, a: "approve" })}><Check /> Approve</Button><Button size="sm" variant="ghost" onClick={() => act.mutate({ id: v.id, a: "deny" })} aria-label="Deny"><X className="text-destructive" /></Button></>}
                  {v.status === "Approved" && <Button size="sm" onClick={() => act.mutate({ id: v.id, a: "check-in" })}><LogIn /> Check in</Button>}
                  {v.status === "Checked In" && <Button size="sm" onClick={() => act.mutate({ id: v.id, a: "check-out" })}><LogOut /> Check out</Button>}
                  <Button size="sm" variant="ghost" aria-label={v.flagged ? "Unflag" : "Flag"} onClick={() => act.mutate({ id: v.id, a: "flag" })}><Flag className={v.flagged ? "text-destructive" : ""} /></Button>
                  {v.status !== "Blacklisted" && <Button size="sm" variant="ghost" aria-label="Blacklist" onClick={() => confirm({ title: `Blacklist ${v.fullName}?`, danger: true, action: "Blacklist", message: "Future registrations with this ID number will be automatically denied.", onConfirm: () => act.mutate({ id: v.id, a: "blacklist" }) })}><Ban className="text-destructive" /></Button>}
                </>
              )}
            </div>) },
        ]} />

      <FormDialog open={adding} onOpenChange={setAdding} title={isResident ? "Request visitor access" : "Register visitor"} schema={visitorSchema}
        description="Visitors must present original identification at the gate."
        initial={{ fullName: "", idType: "National ID", idNumber: "", phone: "", residentId: isResident ? "self" : "", relationship: "", purpose: "", vehicleReg: "", expectedCheckOut: isoLocal(Date.now() + 3 * 3600000) }}
        fields={[
          { name: "fullName", label: "Visitor full name" }, { name: "phone", label: "Phone" },
          { name: "idType", label: "Identification type", type: "select", options: ["National ID", "Passport", "Student ID", "Driving Licence"] }, { name: "idNumber", label: "Identification number" },
          ...(isResident ? [] : [{ name: "residentId", label: "Resident being visited", type: "select" as const, options: L.residents.filter((r) => r.status === "Active").map((r) => ({ value: r.id, label: `${r.fullName} — Room ${L.roomNo(r.roomId)}` })) }]),
          { name: "relationship", label: "Relationship" }, { name: "vehicleReg", label: "Vehicle registration (optional)" },
          { name: "expectedCheckOut", label: "Expected check-out", type: "datetime-local" }, { name: "purpose", label: "Purpose of visit", full: true },
        ]}
        onSubmit={(data) => create.mutateAsync({ ...data, expectedCheckOut: new Date(String(data.expectedCheckOut)).toISOString() })} />

      <Dialog open={!!pass} onOpenChange={(o) => !o && setPass(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Visitor pass</DialogTitle></DialogHeader>
          {pass && <VisitorPass visitor={pass} residentName={L.residentName(pass.residentId)} room={L.roomNo(L.resident(pass.residentId)?.roomId)} />}
          <div className="flex justify-end"><Button variant="outline" onClick={() => window.print()}><Printer /> Print pass</Button></div>
        </DialogContent>
      </Dialog>
      {dialog}
    </QueryGate>
  );
}

// -------------------------------------------------------- ACCESS CONTROL
export function AccessPage() {
  const access = useAccessLogs();
  const { can } = useAuth();
  const [adding, setAdding] = useState(false);
  const create = useAction((data: Record<string, unknown>) => accessApi.create(data), (l) => `${l.status === "Denied" ? "Denied entry" : "Entry recorded"}: ${l.person}`);
  const exit = useAction((id: string) => accessApi.exit(id), (l) => `Exit recorded: ${l.person}`);
  const A = access.data ?? [];
  const inside = A.filter((a) => a.status === "Granted" && !a.exitTime);
  return (
    <QueryGate queries={[access]}>
      <PageHeader title="Access Control" description="Record and monitor every entry and exit at the hostel gates."
        actions={<><DemoBadge />{can("access:create") && <Button onClick={() => setAdding(true)}><DoorOpen /> Record entry</Button>}</>} />
      <section aria-labelledby="inside-h" className="glass mb-5 p-4 ring-2 ring-primary/40">
        <div className="mb-3 flex items-center justify-between">
          <h2 id="inside-h" className="text-base font-semibold">People Currently Inside <span className="ml-2 rounded-full bg-primary px-2.5 py-0.5 font-mono text-sm text-primary-foreground">{inside.length}</span></h2>
          <div className="hidden gap-2 text-[11px] text-muted-foreground sm:flex">{["Resident", "Visitor", "Staff", "Contractor", "Delivery Personnel"].map((t) => <span key={t}>{t}: <b className="font-mono text-foreground">{inside.filter((a) => a.personType === t).length}</b></span>)}</div>
        </div>
        {inside.length ? (
          <ul className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
            {inside.map((a) => (
              <li key={a.id} className="flex items-center justify-between gap-2 rounded-lg bg-secondary p-3">
                <div className="min-w-0"><p className="truncate text-sm font-medium">{a.person}</p><p className="font-mono text-[10px] text-subtle">{a.personType} · {a.gate} · in {tm(a.entryTime)}</p></div>
                {can("access:update") && <Button size="sm" variant="outline" onClick={() => exit.mutate(a.id)}><LogOut /> Exit</Button>}
              </li>
            ))}
          </ul>
        ) : <EmptyState title="Nobody logged inside" />}
      </section>
      <DataTable data={A} rowKey={(a) => a.id} exportName="access-logs" dateField={(a) => a.entryTime} searchPlaceholder="Search person or reference…"
        filters={[
          { key: "type", label: "Person types", options: ["Resident", "Visitor", "Staff", "Contractor", "Delivery Personnel"], value: (a) => a.personType },
          { key: "gate", label: "Gates", options: ["Gate A", "Gate B", "Service Gate"], value: (a) => a.gate },
          { key: "status", label: "Statuses", options: ["Granted", "Denied", "Pending"], value: (a) => a.status },
        ]}
        columns={[
          { key: "person", header: "Person", cell: (a) => <div><p className="font-medium">{a.person}</p><p className="font-mono text-[10px] text-subtle">{a.reference}</p></div>, value: (a) => `${a.person} ${a.reference}` },
          { key: "personType", header: "Type" }, { key: "gate", header: "Gate" },
          { key: "entryTime", header: "Entry", cell: (a) => <span className="font-mono text-xs">{dt(a.entryTime)}</span> },
          { key: "exitTime", header: "Exit", value: (a) => a.exitTime ?? "", cell: (a) => <span className="font-mono text-xs">{a.exitTime ? tm(a.exitTime) : "—"}</span> },
          { key: "officer", header: "Officer", hideOnMobile: true }, { key: "purpose", header: "Purpose", hideOnMobile: true },
          { key: "status", header: "Access", cell: (a) => <StatusBadge value={a.status} /> },
        ]} />
      <FormDialog open={adding} onOpenChange={setAdding} title="Record entry" schema={accessSchema}
        initial={{ person: "", personType: "Resident", reference: "", gate: "Gate A", purpose: "", status: "Granted" }}
        fields={[
          { name: "person", label: "Person name" }, { name: "personType", label: "Person type", type: "select", options: ["Resident", "Visitor", "Staff", "Contractor", "Delivery Personnel"] },
          { name: "reference", label: "ID / reference", help: "Resident ID, pass number or ID number" }, { name: "gate", label: "Gate", type: "select", options: ["Gate A", "Gate B", "Service Gate"] },
          { name: "status", label: "Access decision", type: "select", options: ["Granted", "Denied", "Pending"] }, { name: "purpose", label: "Purpose" },
        ]}
        onSubmit={(data) => create.mutateAsync(data)} />
    </QueryGate>
  );
}

// ------------------------------------------------------------- INCIDENTS
export function IncidentsPage() {
  const incidents = useIncidents();
  const { can } = useAuth();
  const area = useArea();
  const navigate = useNavigate();
  const [sel, setSel] = useState<Incident | null>(null);
  const update = useAction((v: { id: string; data: Record<string, unknown> }) => incidentsApi.update(v.id, v.data), "Incident updated");
  const I = incidents.data ?? [];
  const open = I.filter((i) => !["Resolved", "Closed"].includes(i.status));
  return (
    <QueryGate queries={[incidents]}>
      <PageHeader title="Security Incidents" description="Track, investigate and resolve incidents."
        actions={<><DemoBadge />{can("incidents:create") && <Button onClick={() => navigate({ to: area === "security" ? "/security/incidents/new" : "/admin/incidents/new" })}><Siren /> Report incident</Button>}</>} />
      <div className="mb-4 grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatCard label="Total incidents" value={I.length} />
        <StatCard label="Open" value={open.length} tone="warning" />
        <StatCard label="Critical (open)" value={open.filter((i) => i.severity === "Critical").length} tone="danger" />
        <StatCard label="Resolved / closed" value={I.length - open.length} tone="success" />
      </div>
      <DataTable data={[...I].sort((a, b) => b.createdAt.localeCompare(a.createdAt))} rowKey={(i) => i.id} exportName="incidents" dateField={(i) => i.occurredAt} onRowClick={setSel}
        filters={[
          { key: "type", label: "Categories", options: ["Theft", "Unauthorized Access", "Assault", "Property Damage", "Suspicious Activity", "Fire", "Noise Complaint", "Missing Person", "Harassment", "Other"], value: (i) => i.type },
          { key: "sev", label: "Severities", options: ["Low", "Medium", "High", "Critical"], value: (i) => i.severity },
          { key: "status", label: "Statuses", options: ["Reported", "Under Investigation", "Escalated", "Resolved", "Closed"], value: (i) => i.status },
        ]}
        columns={[
          { key: "number", header: "Incident #", cell: (i) => <span className="font-mono text-xs">{i.number}</span> },
          { key: "type", header: "Type" }, { key: "location", header: "Location", hideOnMobile: true },
          { key: "occurredAt", header: "Date", cell: (i) => <span className="font-mono text-xs">{dt(i.occurredAt)}</span> },
          { key: "reportedBy", header: "Reported by", hideOnMobile: true },
          { key: "severity", header: "Severity", cell: (i) => <StatusBadge value={i.severity} /> },
          { key: "assignedOfficer", header: "Officer", hideOnMobile: true, value: (i) => i.assignedOfficer ?? "Unassigned" },
          { key: "status", header: "Status", cell: (i) => <StatusBadge value={i.status} /> },
        ]} />
      <Dialog open={!!sel} onOpenChange={(o) => !o && setSel(null)}>
        <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
          <DialogHeader><DialogTitle>{sel?.number} · {sel?.type}</DialogTitle></DialogHeader>
          {sel && <IncidentDetail incident={sel} canUpdate={can("incidents:update")} onSave={async (data) => { await update.mutateAsync({ id: sel.id, data }); setSel(null); }} />}
        </DialogContent>
      </Dialog>
    </QueryGate>
  );
}

function IncidentDetail({ incident: i, canUpdate, onSave }: { incident: Incident; canUpdate: boolean; onSave: (d: Record<string, unknown>) => Promise<void> }) {
  const form = useZodForm(incidentUpdateSchema, { status: i.status, assignedOfficer: i.assignedOfficer ?? "", resolution: i.resolution });
  return (
    <div className="space-y-5">
      <div className="flex gap-2"><StatusBadge value={i.severity} /><StatusBadge value={i.status} /></div>
      <KV items={[["Occurred", dt(i.occurredAt)], ["Location", i.location], ["Reported by", i.reportedBy], ["Recorded", dt(i.createdAt)], ["People involved", i.peopleInvolved], ["Witnesses", i.witnesses], ["Evidence", i.evidence.join(", ") || "None"], ["Resolution date", d(i.resolvedAt)]]} />
      <div><p className="text-[11px] uppercase text-subtle">Description</p><p className="mt-1 text-sm">{i.description}</p></div>
      {canUpdate ? (
        <form noValidate className="space-y-4 border-t border-border pt-4" onSubmit={async (e) => { e.preventDefault(); await form.submit(onSave); }}>
          <FormFields values={form.values} errors={form.errors} onChange={form.onChange} fields={[
            { name: "status", label: "Status", type: "select", options: ["Reported", "Under Investigation", "Escalated", "Resolved", "Closed"] },
            { name: "assignedOfficer", label: "Assigned officer" }, { name: "resolution", label: "Resolution notes", type: "textarea" },
          ]} />
          <div className="flex justify-end"><Button type="submit" disabled={form.busy}>Update incident</Button></div>
        </form>
      ) : i.resolution && <div><p className="text-[11px] uppercase text-subtle">Resolution</p><p className="mt-1 text-sm">{i.resolution}</p></div>}
    </div>
  );
}

export function IncidentFormPage() {
  const { user } = useAuth();
  const area = useArea();
  const navigate = useNavigate();
  const [files, setFiles] = useState<string[]>([]);
  const [done, setDone] = useState<Incident | null>(null);
  const form = useZodForm(incidentSchema, { type: "", location: "", occurredAt: isoLocal(Date.now()), description: "", peopleInvolved: "", witnesses: "", severity: "Medium" });
  const create = useAction((data: Record<string, unknown>) => incidentsApi.create(data), (i) => `Incident ${i.number} submitted`);
  if (done) {
    return (
      <Panel className="mx-auto max-w-lg text-center">
        <Siren className="mx-auto size-10 text-warning" aria-hidden />
        <h1 className="mt-3 text-lg font-semibold">Incident reported</h1>
        <p className="mt-1 text-sm text-muted-foreground">Your report was recorded and security/administrators have been notified.</p>
        <div className="mt-4"><KV items={[["Incident number", <span key="n" className="font-mono">{done.number}</span>], ["Recorded at", dt(done.createdAt)], ["Severity", done.severity], ["Status", done.status]]} /></div>
        <div className="mt-5 flex justify-center gap-2">
          <Button variant="outline" onClick={() => { setDone(null); form.reset(); setFiles([]); }}>Report another</Button>
          {area !== "resident" && <Button onClick={() => navigate({ to: area === "security" ? "/security/incidents" : "/admin/incidents" })}>View incidents</Button>}
        </div>
      </Panel>
    );
  }
  return (
    <>
      <PageHeader title="Report an incident" description="Provide as much detail as possible. False reports are a disciplinary offence." />
      <Panel>
        <form noValidate className="space-y-5" onSubmit={async (e) => {
          e.preventDefault();
          await form.submit(async (data) => { const i = await create.mutateAsync({ ...data, occurredAt: new Date(String(data.occurredAt)).toISOString(), evidence: files }); setDone(i); });
        }}>
          <FormFields values={form.values} errors={form.errors} onChange={form.onChange} fields={[
            { name: "type", label: "Incident type", type: "select", options: ["Theft", "Unauthorized Access", "Assault", "Property Damage", "Suspicious Activity", "Fire", "Noise Complaint", "Missing Person", "Harassment", "Other"] },
            { name: "severity", label: "Severity", type: "select", options: ["Low", "Medium", "High", "Critical"] },
            { name: "location", label: "Location", placeholder: "e.g. Block B, 2nd floor corridor" }, { name: "occurredAt", label: "Date & time", type: "datetime-local" },
            { name: "description", label: "Description", type: "textarea" },
            { name: "peopleInvolved", label: "People involved" }, { name: "witnesses", label: "Witnesses" },
          ]} />
          <div>
            <label htmlFor="evidence" className="mb-1.5 block text-xs font-medium text-muted-foreground">Supporting evidence (images/PDF, max 5 files, 5 MB each)</label>
            <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-dashed border-input p-4 text-sm text-muted-foreground hover:bg-secondary">
              <Upload className="size-4" aria-hidden /> Choose files
              <input id="evidence" type="file" multiple accept="image/*,application/pdf" className="sr-only" onChange={(e) => {
                const ok = Array.from(e.target.files ?? []).filter((f) => f.size <= 5 * 1024 * 1024 && /^(image\/|application\/pdf)/.test(f.type)).slice(0, 5);
                setFiles(ok.map((f) => f.name.replace(/[^\w.-]/g, "_")));
              }} />
            </label>
            {files.length > 0 && <p className="mt-1 text-xs text-muted-foreground">{files.join(", ")} — uploaded to secure storage once the backend is connected.</p>}
          </div>
          <div className="flex flex-col gap-3 border-t border-border pt-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs text-muted-foreground">Reporter: <b className="text-foreground">{user?.fullName}</b> · timestamp recorded on submit</p>
            <Button type="submit" disabled={form.busy}><Siren /> Submit report</Button>
          </div>
        </form>
      </Panel>
    </>
  );
}

// ---------------------------------------------------------- LOST & FOUND
export function LostFoundPage() {
  const items = useLostFound();
  const { can } = useAuth();
  const [adding, setAdding] = useState(false);
  const create = useAction((data: Record<string, unknown>) => lostFoundApi.create(data), "Item logged");
  const update = useAction((v: { id: string; status: string; claimedBy?: string }) => lostFoundApi.update(v.id, v), "Item updated");
  const [claim, setClaim] = useState<{ id: string; status: string } | null>(null);
  const [claimant, setClaimant] = useState("");
  return (
    <QueryGate queries={[items]}>
      <PageHeader title="Lost & Found" description="Report lost items or log items found on the premises."
        actions={<><DemoBadge />{can("lostfound:create") && <Button onClick={() => setAdding(true)}><Plus /> Report item</Button>}</>} />
      <DataTable data={items.data ?? []} rowKey={(i) => i.id} exportName="lost-found" dateField={(i) => i.foundAt}
        filters={[{ key: "status", label: "Statuses", options: ["Unclaimed", "Claimed", "Returned"], value: (i) => i.status }, { key: "kind", label: "Kinds", options: ["Lost", "Found"], value: (i) => i.kind }, { key: "cat", label: "Categories", options: ["Electronics", "Documents", "Clothing", "Keys", "Bags", "Other"], value: (i) => i.category }]}
        columns={[
          { key: "id", header: "Item ID", cell: (i) => <span className="font-mono text-xs">{i.id}</span> },
          { key: "name", header: "Item", cell: (i) => <div><p className="font-medium">{i.name}</p><p className="text-[11px] text-subtle">{i.category}</p></div> },
          { key: "kind", header: "Type", cell: (i) => <StatusBadge value={i.kind} /> },
          { key: "location", header: "Location", hideOnMobile: true }, { key: "foundAt", header: "Date", cell: (i) => d(i.foundAt) },
          { key: "foundBy", header: "Reported by", hideOnMobile: true }, { key: "claimedBy", header: "Claimed by", hideOnMobile: true, value: (i) => i.claimedBy ?? "—" },
          { key: "status", header: "Status", cell: (i) => <StatusBadge value={i.status} /> },
          { key: "act", header: "", value: () => "", cell: (i) => can("lostfound:update") && i.status !== "Returned" ? (
            <Button size="sm" variant="outline" onClick={() => { setClaimant(i.claimedBy ?? ""); setClaim({ id: i.id, status: i.status === "Unclaimed" ? "Claimed" : "Returned" }); }}>Mark {i.status === "Unclaimed" ? "claimed" : "returned"}</Button>) : null },
        ]} />
      <FormDialog open={adding} onOpenChange={setAdding} title="Report lost or found item" schema={lostFoundSchema}
        initial={{ name: "", description: "", category: "Other", location: "", kind: "Found" }}
        fields={[{ name: "kind", label: "I have…", type: "select", options: [{ value: "Found", label: "Found an item" }, { value: "Lost", label: "Lost an item" }] }, { name: "name", label: "Item name" }, { name: "category", label: "Category", type: "select", options: ["Electronics", "Documents", "Clothing", "Keys", "Bags", "Other"] }, { name: "location", label: "Location" }, { name: "description", label: "Description", type: "textarea" }]}
        onSubmit={(data) => create.mutateAsync(data)} />
      <Dialog open={!!claim} onOpenChange={(o) => !o && setClaim(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Mark as {claim?.status.toLowerCase()}</DialogTitle></DialogHeader>
          <label htmlFor="claimant" className="text-xs text-muted-foreground">Claimed by (verify ID before release)</label>
          <input id="claimant" className="field" value={claimant} maxLength={100} onChange={(e) => setClaimant(e.target.value)} />
          <div className="flex justify-end gap-2"><Button variant="ghost" onClick={() => setClaim(null)}>Cancel</Button>
            <Button disabled={claimant.trim().length < 2} onClick={() => { if (claim) update.mutate({ ...claim, claimedBy: claimant.trim() }); setClaim(null); }}>Confirm</Button></div>
        </DialogContent>
      </Dialog>
    </QueryGate>
  );
}

// ------------------------------------------------------------- EMERGENCY
export function EmergencyPage() {
  const contacts = useEmergency();
  const { role } = useAuth();
  const [alerting, setAlerting] = useState(false);
  const alert = useAction((data: Record<string, unknown>) => emergencyApi.alert(data as { title: string; message: string; channels: string[] }), "Emergency alert broadcast (SMS/Email queued for integration)");
  const canAlert = role !== "RESIDENT";
  return (
    <QueryGate queries={[contacts]}>
      <PageHeader title="Emergency" description="Tap a number to call. In immediate danger, call 999." actions={canAlert ? <Button variant="destructive" onClick={() => setAlerting(true)}><Siren /> Send emergency alert</Button> : undefined} />
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {(contacts.data ?? []).map((c, i) => (
          <a key={c.id} href={`tel:${c.phone.replace(/\s/g, "")}`} className={`glass flex items-center gap-4 p-4 transition-colors hover:bg-secondary ${i < 3 ? "ring-2 ring-destructive/40" : ""}`}>
            <div className={`grid size-12 shrink-0 place-items-center rounded-full ${i < 3 ? "bg-destructive text-destructive-foreground" : "bg-primary/20 text-primary"}`}><Phone className="size-5" aria-hidden /></div>
            <div className="min-w-0"><p className="font-medium">{c.name}</p><p className="font-mono text-lg">{c.phone}</p><p className="text-[11px] text-muted-foreground">{c.category} · {c.available}</p></div>
          </a>
        ))}
      </div>
      {canAlert && (
        <FormDialog open={alerting} onOpenChange={setAlerting} title="Broadcast emergency alert" description="Sends an in-app alert to all users now. SMS and Email channels are queued for the messaging provider integration." schema={emergencyAlertSchema}
          initial={{ title: "", message: "", channels: ["In-app"] }} submitLabel="Broadcast alert"
          fields={[{ name: "title", label: "Alert title", full: true }, { name: "message", label: "Message", type: "textarea" }]}
          onSubmit={(data) => alert.mutateAsync(data)} />
      )}
    </QueryGate>
  );
}
