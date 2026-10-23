import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Eye, Pencil, Plus, UserX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DataTable } from "@/components/app/data-table";
import { FormDialog, FormFields, useZodForm, type Field } from "@/components/app/form-dialog";
import { DemoBadge, EmptyState, ErrorState, KV, PageHeader, Panel, QueryGate, StatusBadge, useConfirm } from "@/components/app/ui-kit";
import { useAction, useAllocations, useAuditLogs, useComplaints, useIncidents, useMaintenance, usePayments, useVisitors } from "@/lib/api/hooks";
import { residentsApi } from "@/lib/api/services";
import { useAuth } from "@/lib/auth/auth-context";
import { residentSchema } from "@/lib/validation";
import { d, dt, initials, kes } from "@/lib/format";
import type { Resident } from "@/lib/types";
import { useArea, useLookups } from "./shared";

const STATUSES = ["Active", "Checked Out", "Suspended", "Expelled", "Graduated"];
export const residentFields: Field[] = [
  { name: "fullName", label: "Full name" }, { name: "admissionNo", label: "Admission / Student no.", placeholder: "SCT/2024/0123" },
  { name: "gender", label: "Gender", type: "select", options: ["Male", "Female"] }, { name: "dob", label: "Date of birth", type: "date" },
  { name: "phone", label: "Phone", placeholder: "+254 7XX XXX XXX" }, { name: "email", label: "Email", type: "email" },
  { name: "course", label: "Course" }, { name: "department", label: "Department" },
  { name: "yearOfStudy", label: "Year of study", type: "select", options: ["1", "2", "3", "4", "5", "6"] },
  { name: "status", label: "Status", type: "select", options: STATUSES },
  { name: "emergencyName", label: "Emergency contact name" }, { name: "emergencyPhone", label: "Emergency contact phone" },
];
const blank = { fullName: "", admissionNo: "", gender: "", dob: "", phone: "", email: "", course: "", department: "", yearOfStudy: "1", status: "Active", emergencyName: "", emergencyPhone: "" };

export function ResidentsPage({ initialQuery }: { initialQuery?: string }) {
  const L = useLookups();
  const { can } = useAuth();
  const area = useArea();
  const navigate = useNavigate();
  const [edit, setEdit] = useState<Resident | null>(null);
  const [adding, setAdding] = useState(false);
  const { confirm, dialog } = useConfirm();
  const save = useAction((v: { id?: string; data: Record<string, unknown> }) => (v.id ? residentsApi.update(v.id, v.data) : residentsApi.create(v.data)), "Resident saved");
  const deactivate = useAction((id: string) => residentsApi.remove(id), "Resident deactivated and bed released");
  const open = (r: Resident) => navigate({ to: area === "security" ? "/security/residents/$id" : "/admin/residents/$id", params: { id: r.id } });

  return (
    <QueryGate queries={L.queries}>
      <PageHeader title="Residents" description="Search, filter and manage hostel residents." actions={<>
        <DemoBadge />
        {can("residents:create") && <Button onClick={() => setAdding(true)}><Plus /> Add resident</Button>}
      </>} />
      <SearchSeed q={initialQuery} />
      <DataTable
        data={L.residents} rowKey={(r) => r.id} exportName="residents" onRowClick={open}
        searchPlaceholder="Search name, ID, admission no., phone, room…"
        dateField={(r) => r.registeredAt}
        filters={[
          { key: "status", label: "Statuses", options: STATUSES, value: (r) => r.status },
          { key: "year", label: "Years", options: ["1", "2", "3", "4"], value: (r) => String(r.yearOfStudy) },
          { key: "gender", label: "Genders", options: ["Male", "Female"], value: (r) => r.gender },
        ]}
        columns={[
          { key: "fullName", header: "Resident", cell: (r) => (
            <div className="flex items-center gap-2.5">
              <div className="grid size-8 shrink-0 place-items-center rounded-full bg-primary/20 text-[11px] font-semibold text-primary">{initials(r.fullName)}</div>
              <div className="min-w-0"><p className="truncate font-medium">{r.fullName}</p><p className="font-mono text-[10px] text-subtle">{r.id} · {r.admissionNo}</p></div>
            </div>) },
          { key: "course", header: "Course", hideOnMobile: true, cell: (r) => <span className="text-muted-foreground">{r.course} · Y{r.yearOfStudy}</span> },
          { key: "room", header: "Room / Bed", value: (r) => (r.roomId ? `${L.roomNo(r.roomId)}-${L.bed(r.bedId)?.number ?? ""}` : "—") },
          { key: "phone", header: "Phone", hideOnMobile: true },
          { key: "status", header: "Status", cell: (r) => <StatusBadge value={r.status} /> },
          { key: "actions", header: "", value: () => "", cell: (r) => (
            <div className="flex justify-end gap-1" onClick={(e) => e.stopPropagation()}>
              <Button variant="ghost" size="icon" aria-label={`View ${r.fullName}`} onClick={() => open(r)}><Eye /></Button>
              {can("residents:update") && <Button variant="ghost" size="icon" aria-label={`Edit ${r.fullName}`} onClick={() => setEdit(r)}><Pencil /></Button>}
              {can("residents:delete") && r.status === "Active" && (
                <Button variant="ghost" size="icon" aria-label={`Deactivate ${r.fullName}`} onClick={() => confirm({
                  title: "Deactivate resident?", danger: true, action: "Deactivate",
                  message: `${r.fullName} will be marked Checked Out and their bed released. History is kept for audit.`,
                  onConfirm: () => deactivate.mutate(r.id),
                })}><UserX className="text-destructive" /></Button>
              )}
            </div>) },
        ]}
      />
      <FormDialog open={adding || !!edit} onOpenChange={(o) => { if (!o) { setAdding(false); setEdit(null); } }}
        title={edit ? `Edit ${edit.fullName}` : "Add resident"} schema={residentSchema} fields={residentFields}
        initial={edit ? { ...edit, yearOfStudy: String(edit.yearOfStudy) } : blank}
        onSubmit={(data) => save.mutateAsync({ id: edit?.id, data })} />
      {dialog}
    </QueryGate>
  );
}

function SearchSeed({ q }: { q?: string }) {
  if (!q) return null;
  return <p className="mb-2 text-xs text-muted-foreground">Tip: type “{q}” in the search box below to filter.</p>;
}

export function ResidentNewPage() {
  const form = useZodForm(residentSchema, blank);
  const navigate = useNavigate();
  const save = useAction((data: Record<string, unknown>) => residentsApi.create(data), (r) => `${r.fullName} registered as ${r.id}`);
  return (
    <>
      <PageHeader title="Add resident" description="Register a new resident. Allocate a bed afterwards from Allocations." />
      <Panel>
        <form noValidate className="space-y-5" onSubmit={async (e) => {
          e.preventDefault();
          const ok = await form.submit(async (data) => {
            const r = await save.mutateAsync(data);
            navigate({ to: "/admin/residents/$id", params: { id: r.id } });
          });
          void ok;
        }}>
          <FormFields fields={residentFields} values={form.values} errors={form.errors} onChange={form.onChange} />
          <div className="flex justify-end gap-2"><Button type="button" variant="ghost" onClick={() => form.reset()}>Clear</Button><Button type="submit" disabled={form.busy}>Register resident</Button></div>
        </form>
      </Panel>
    </>
  );
}

export function ResidentProfile({ id }: { id: string }) {
  const L = useLookups();
  const payments = usePayments();
  const visitors = useVisitors();
  const complaints = useComplaints();
  const maintenance = useMaintenance();
  const incidents = useIncidents();
  const allocations = useAllocations();
  const { can } = useAuth();
  const audit = useAuditLogs();
  const r = L.resident(id);
  if (!L.queries.some((q) => q.isLoading) && !r) return <ErrorState error={new Error("Resident not found or you do not have access.")} />;
  const room = L.room(r?.roomId);
  const mine = <T extends { residentId: string | null }>(xs?: T[]) => (xs ?? []).filter((x) => x.residentId === id);
  const simpleList = (rows: { id: string; a: string; b: string; s: string }[]) =>
    rows.length ? <ul className="divide-y divide-border">{rows.map((x) => <li key={x.id} className="flex items-center justify-between gap-2 py-2 text-[13px]"><div className="min-w-0"><p className="truncate">{x.a}</p><p className="font-mono text-[10px] text-subtle">{x.b}</p></div><StatusBadge value={x.s} /></li>)}</ul> : <EmptyState />;

  return (
    <QueryGate queries={L.queries}>
      {r && (
        <>
          <div className="glass mb-5 flex flex-col gap-4 p-5 sm:flex-row sm:items-center">
            <div className="grid size-16 shrink-0 place-items-center rounded-full brand-gradient text-xl font-semibold text-primary-foreground" aria-hidden>{initials(r.fullName)}</div>
            <div className="flex-1">
              <h1 className="text-xl font-semibold">{r.fullName}</h1>
              <p className="font-mono text-xs text-muted-foreground">{r.id} · {r.admissionNo}</p>
              <p className="mt-1 text-sm text-muted-foreground">{r.course} · Year {r.yearOfStudy}</p>
            </div>
            <div className="flex flex-col items-start gap-1 sm:items-end"><StatusBadge value={r.status} /><span className="text-xs text-muted-foreground">Room {room?.number ?? "—"} · Bed {L.bed(r.bedId)?.number ?? "—"}</span></div>
          </div>
          <Tabs defaultValue="personal">
            <TabsList className="flex h-auto flex-wrap justify-start gap-1 bg-secondary">
              {["personal", "room", "payments", "visitors", "complaints", "maintenance", "incidents", "activity"].map((t) => <TabsTrigger key={t} value={t} className="capitalize">{t === "personal" ? "Personal info" : t === "room" ? "Room allocation" : t === "activity" ? "Activity history" : t}</TabsTrigger>)}
            </TabsList>
            <Panel className="mt-3">
              <TabsContent value="personal"><KV items={[["Full name", r.fullName], ["Gender", r.gender], ["Date of birth", d(r.dob)], ["Phone", r.phone], ["Email", r.email], ["Course", r.course], ["Department", r.department], ["Year of study", r.yearOfStudy], ["Emergency contact", r.emergencyName], ["Emergency phone", r.emergencyPhone], ["Registered", d(r.registeredAt)], ["Status", <StatusBadge key="s" value={r.status} />]]} /></TabsContent>
              <TabsContent value="room">
                {room ? <KV items={[["Room", room.number], ["Block / floor", `Block ${room.block}, floor ${room.floor}`], ["Room type", room.type], ["Bed", L.bed(r.bedId)?.number], ["Monthly rent", kes(room.monthlyRent)], ["Room status", room.status]]} /> : <EmptyState title="No bed allocated" />}
                <h3 className="mb-2 mt-6 text-xs font-semibold uppercase text-subtle">Allocation history</h3>
                {simpleList(mine(allocations.data).map((a) => ({ id: a.id, a: `Room ${L.roomNo(a.roomId)} · Bed ${L.bed(a.bedId)?.number ?? a.bedId}`, b: `${d(a.allocatedAt)} → ${a.endedAt ? d(a.endedAt) : "present"} · by ${a.allocatedBy}`, s: a.endedAt ? "Closed" : "Active" })))}
              </TabsContent>
              <TabsContent value="payments">{simpleList(mine(payments.data).sort((a, b) => b.period.localeCompare(a.period)).map((p) => ({ id: p.id, a: `${p.period} · ${kes(p.amountPaid)} of ${kes(p.amountDue)}`, b: `${p.method ?? "—"} ${p.reference} · due ${d(p.dueDate)}`, s: p.status })))}</TabsContent>
              <TabsContent value="visitors">{simpleList(mine(visitors.data).map((v) => ({ id: v.id, a: `${v.fullName} (${v.relationship})`, b: `${dt(v.checkIn ?? v.createdAt)} · ${v.purpose}`, s: v.status })))}</TabsContent>
              <TabsContent value="complaints">{simpleList(mine(complaints.data).map((c) => ({ id: c.id, a: c.subject, b: `${c.category} · ${d(c.submittedAt)}`, s: c.status })))}</TabsContent>
              <TabsContent value="maintenance">{simpleList(mine(maintenance.data).map((m) => ({ id: m.id, a: `${m.category}: ${m.description}`, b: `${d(m.createdAt)} · ${m.technician ?? "unassigned"}`, s: m.status })))}</TabsContent>
              <TabsContent value="incidents">{simpleList(mine(incidents.data).map((i) => ({ id: i.id, a: `${i.type} — ${i.location}`, b: `${i.number} · ${dt(i.createdAt)}`, s: i.status })))}</TabsContent>
              <TabsContent value="activity">
                {can("audit:read") ? simpleList((audit.data ?? []).filter((l) => l.description.includes(r.id) || l.description.includes(r.fullName)).map((l) => ({ id: l.id, a: l.description, b: `${dt(l.timestamp)} · ${l.user}`, s: l.result }))) : <EmptyState title="Restricted" message="Activity history is available to roles with audit access." />}
              </TabsContent>
            </Panel>
          </Tabs>
        </>
      )}
    </QueryGate>
  );
}

export function MyProfile() {
  const { user } = useAuth();
  return (
    <>
      <PageHeader title="My Profile" description="Your personal record. Contact the hostel office to change these details." actions={<DemoBadge />} />
      {user?.residentId ? <ResidentProfile id={user.residentId} /> : <EmptyState title="No resident record linked" />}
    </>
  );
}
