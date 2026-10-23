import { useMemo, useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/app/data-table";
import { FormDialog, FormFields, useZodForm } from "@/components/app/form-dialog";
import { DemoBadge, EmptyState, KV, PageHeader, Panel, QueryGate, StatCard, StatusBadge } from "@/components/app/ui-kit";
import { useAction, useAllocations } from "@/lib/api/hooks";
import { allocationsApi, bedsApi, roomsApi } from "@/lib/api/services";
import { useAuth } from "@/lib/auth/auth-context";
import { allocationSchema, roomSchema } from "@/lib/validation";
import { d, kes } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { Bed, Room } from "@/lib/types";
import { useLookups } from "./shared";

const bedTone: Record<Bed["status"], string> = {
  Occupied: "bg-primary/25 ring-primary/40 text-foreground",
  Available: "bg-success/15 ring-success/40 text-success",
  Reserved: "bg-warning/15 ring-warning/40 text-warning",
  Maintenance: "bg-destructive/15 ring-destructive/40 text-destructive",
};

function RoomCard({ room, beds, name }: { room: Room; beds: Bed[]; name: (id: string | null) => string }) {
  const occ = beds.filter((b) => b.status === "Occupied").length;
  return (
    <div className="glass p-4">
      <div className="flex items-start justify-between">
        <div><p className="font-mono text-lg font-medium">Room {room.number}</p><p className="text-[11px] text-muted-foreground">Block {room.block} · Floor {room.floor} · {room.type}</p></div>
        <StatusBadge value={room.status} />
      </div>
      <p className="mt-2 text-xs text-muted-foreground">Capacity {room.capacity} · {occ} occupied · {room.capacity - occ} free · {kes(room.monthlyRent)}/mo</p>
      <ul className="mt-3 grid grid-cols-2 gap-2">
        {beds.map((b) => (
          <li key={b.id} className={cn("rounded-lg px-2.5 py-2 text-[11px] ring-1", bedTone[b.status])}>
            <p className="font-semibold">Bed {b.number} — {b.status}</p>
            {b.residentId && <p className="truncate text-muted-foreground">{name(b.residentId)}</p>}
          </li>
        ))}
      </ul>
    </div>
  );
}

export function RoomsPage() {
  const L = useLookups();
  const { can } = useAuth();
  const [view, setView] = useState<"grid" | "table">("grid");
  const [block, setBlock] = useState("");
  const [adding, setAdding] = useState(false);
  const [edit, setEdit] = useState<Room | null>(null);
  const save = useAction((v: { id?: string; data: Record<string, unknown> }) => (v.id ? roomsApi.update(v.id, v.data) : roomsApi.create(v.data)), "Room saved");
  const bedsOf = (id: string) => L.beds.filter((b) => b.roomId === id);
  const rooms = L.rooms.filter((r) => !block || r.block === block);
  return (
    <QueryGate queries={L.queries}>
      <PageHeader title="Rooms" description="Visual occupancy across all blocks." actions={<>
        <DemoBadge />
        <div className="flex rounded-lg bg-secondary p-1 text-xs" role="group" aria-label="View">
          {(["grid", "table"] as const).map((v) => <button key={v} onClick={() => setView(v)} aria-pressed={view === v} className={cn("rounded-md px-3 py-1.5 capitalize", view === v && "bg-primary text-primary-foreground")}>{v}</button>)}
        </div>
        {can("rooms:create") && <Button onClick={() => setAdding(true)}><Plus /> Add room</Button>}
      </>} />
      <div className="mb-4 grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatCard label="Rooms" value={L.rooms.length} />
        <StatCard label="Fully occupied" value={L.rooms.filter((r) => r.status === "Fully Occupied").length} />
        <StatCard label="Available beds" value={L.beds.filter((b) => b.status === "Available").length} tone="success" />
        <StatCard label="Under maintenance / closed" value={L.rooms.filter((r) => ["Maintenance", "Closed"].includes(r.status)).length} tone="warning" />
      </div>
      {view === "grid" ? (
        <>
          <div className="mb-3 flex flex-wrap gap-2">{["", "A", "B", "C", "D"].map((b) => <Button key={b} size="sm" variant={block === b ? "default" : "outline"} onClick={() => setBlock(b)}>{b ? `Block ${b}` : "All blocks"}</Button>)}</div>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">{rooms.map((r) => <div key={r.id} onClick={() => can("rooms:update") && setEdit(r)} className={can("rooms:update") ? "cursor-pointer" : ""}><RoomCard room={r} beds={bedsOf(r.id)} name={L.residentName} /></div>)}</div>
        </>
      ) : (
        <DataTable data={L.rooms} rowKey={(r) => r.id} exportName="rooms" onRowClick={can("rooms:update") ? setEdit : undefined}
          filters={[{ key: "block", label: "Blocks", options: ["A", "B", "C", "D"], value: (r) => r.block }, { key: "type", label: "Types", options: ["Single", "Double", "Triple", "Shared"], value: (r) => r.type }, { key: "status", label: "Statuses", options: ["Available", "Partially Occupied", "Fully Occupied", "Maintenance", "Closed"], value: (r) => r.status }]}
          columns={[
            { key: "id", header: "Room ID", cell: (r) => <span className="font-mono text-xs">{r.id}</span> }, { key: "number", header: "Room" },
            { key: "block", header: "Block" }, { key: "floor", header: "Floor", hideOnMobile: true }, { key: "type", header: "Type", hideOnMobile: true },
            { key: "capacity", header: "Capacity" }, { key: "occ", header: "Occupants", value: (r) => bedsOf(r.id).filter((b) => b.status === "Occupied").length },
            { key: "free", header: "Available", value: (r) => bedsOf(r.id).filter((b) => b.status === "Available").length },
            { key: "status", header: "Status", cell: (r) => <StatusBadge value={r.status} /> },
          ]} />
      )}
      <FormDialog open={adding || !!edit} onOpenChange={(o) => { if (!o) { setAdding(false); setEdit(null); } }} title={edit ? `Edit room ${edit.number}` : "Add room"}
        description={edit ? undefined : "Beds A, B, C… are created automatically from capacity."} schema={roomSchema}
        initial={edit ? { ...edit, floor: String(edit.floor), capacity: String(edit.capacity), monthlyRent: String(edit.monthlyRent) } : { number: "", block: "A", floor: "1", type: "Double", capacity: "2", status: "Available", monthlyRent: "7000" }}
        fields={[{ name: "number", label: "Room number" }, { name: "block", label: "Block", type: "select", options: ["A", "B", "C", "D"] }, { name: "floor", label: "Floor", type: "number" }, { name: "type", label: "Type", type: "select", options: ["Single", "Double", "Triple", "Shared"] }, { name: "capacity", label: "Capacity", type: "number" }, { name: "status", label: "Status", type: "select", options: ["Available", "Partially Occupied", "Fully Occupied", "Maintenance", "Closed"] }, { name: "monthlyRent", label: "Monthly rent (KES)", type: "number" }]}
        onSubmit={(data) => save.mutateAsync({ id: edit?.id, data })} />
    </QueryGate>
  );
}

export function BedsPage() {
  const L = useLookups();
  const { can } = useAuth();
  const setStatus = useAction((v: { id: string; status: string }) => bedsApi.update(v.id, { status: v.status }), "Bed status updated");
  return (
    <QueryGate queries={L.queries}>
      <PageHeader title="Beds" description="Every bed and its current occupant." actions={<DemoBadge />} />
      <DataTable data={L.beds} rowKey={(b) => b.id} exportName="beds"
        filters={[{ key: "status", label: "Statuses", options: ["Available", "Occupied", "Reserved", "Maintenance"], value: (b) => b.status }, { key: "block", label: "Blocks", options: ["A", "B", "C", "D"], value: (b) => L.room(b.roomId)?.block ?? "" }]}
        columns={[
          { key: "id", header: "Bed ID", cell: (b) => <span className="font-mono text-xs">{b.id}</span> }, { key: "number", header: "Bed" },
          { key: "room", header: "Room", value: (b) => L.roomNo(b.roomId) }, { key: "resident", header: "Current resident", value: (b) => (b.residentId ? L.residentName(b.residentId) : "—") },
          { key: "status", header: "Status", cell: (b) => <StatusBadge value={b.status} /> },
          { key: "act", header: "", value: () => "", cell: (b) => can("beds:update") && b.status !== "Occupied" ? (
            <select aria-label={`Change status of ${b.id}`} className="field h-8 w-36 text-xs" value={b.status} onChange={(e) => setStatus.mutate({ id: b.id, status: e.target.value })}>
              {["Available", "Reserved", "Maintenance"].map((s) => <option key={s}>{s}</option>)}
            </select>) : null },
        ]} />
    </QueryGate>
  );
}

export function AllocationsPage() {
  const L = useLookups();
  const allocations = useAllocations();
  const { can } = useAuth();
  const form = useZodForm(allocationSchema, { residentId: "", bedId: "" });
  const allocate = useAction((data: Record<string, unknown>) => allocationsApi.create(data), "Bed allocated");
  const freeBeds = useMemo(() => L.beds.filter((b) => {
    const r = L.room(b.roomId);
    return (b.status === "Available" || b.status === "Reserved") && r && !["Maintenance", "Closed"].includes(r.status);
  }), [L]);
  const eligible = L.residents.filter((r) => r.status === "Active");
  return (
    <QueryGate queries={[...L.queries, allocations]}>
      <PageHeader title="Allocations" description="Assign residents to available beds. Occupied beds cannot be selected." actions={<DemoBadge />} />
      {can("allocations:create") && (
        <Panel title="New allocation" className="mb-5">
          <form noValidate className="space-y-4" onSubmit={async (e) => { e.preventDefault(); if (await form.submit((d) => allocate.mutateAsync(d))) form.reset(); }}>
            <FormFields values={form.values} errors={form.errors} onChange={form.onChange} fields={[
              { name: "residentId", label: "Resident", type: "select", options: eligible.map((r) => ({ value: r.id, label: `${r.fullName} (${r.id})${r.bedId ? ` — currently ${L.roomNo(r.roomId)}` : " — unallocated"}` })) },
              { name: "bedId", label: `Available bed (${freeBeds.length})`, type: "select", options: freeBeds.map((b) => ({ value: b.id, label: `Room ${L.roomNo(b.roomId)} · Bed ${b.number} · ${L.room(b.roomId)?.type}${b.status === "Reserved" ? " (reserved)" : ""}` })) },
            ]} />
            {form.values.residentId && L.resident(String(form.values.residentId))?.bedId && <p className="text-xs text-warning">This resident already has a bed — allocating will move them and release the old bed.</p>}
            <div className="flex justify-end"><Button type="submit" disabled={form.busy}>Allocate bed</Button></div>
          </form>
        </Panel>
      )}
      <DataTable data={allocations.data ?? []} rowKey={(a) => a.id} exportName="allocations" dateField={(a) => a.allocatedAt}
        filters={[{ key: "st", label: "States", options: ["Current", "Ended"], value: (a) => (a.endedAt ? "Ended" : "Current") }]}
        columns={[
          { key: "id", header: "ID", cell: (a) => <span className="font-mono text-xs">{a.id}</span> },
          { key: "res", header: "Resident", value: (a) => L.residentName(a.residentId) },
          { key: "room", header: "Room", value: (a) => L.roomNo(a.roomId) }, { key: "bed", header: "Bed", value: (a) => L.bed(a.bedId)?.number ?? a.bedId },
          { key: "allocatedAt", header: "Allocated", value: (a) => a.allocatedAt, cell: (a) => d(a.allocatedAt) },
          { key: "allocatedBy", header: "By", hideOnMobile: true },
          { key: "st", header: "Status", cell: (a) => <StatusBadge value={a.endedAt ? "Closed" : "Active"} /> },
        ]} />
    </QueryGate>
  );
}

export function MyRoom() {
  const { user } = useAuth();
  const L = useLookups();
  const me = L.resident(user?.residentId);
  const room = L.room(me?.roomId);
  return (
    <QueryGate queries={L.queries}>
      <PageHeader title="My Room" actions={<DemoBadge />} />
      {room ? (
        <div className="grid gap-4 lg:grid-cols-2">
          <RoomCard room={room} beds={L.beds.filter((b) => b.roomId === room.id)} name={(id) => (id === me?.id ? "You" : L.residentName(id))} />
          <Panel title="Allocation details"><KV items={[["Room", room.number], ["Your bed", L.bed(me?.bedId)?.number], ["Block", room.block], ["Floor", room.floor], ["Type", room.type], ["Monthly rent", kes(room.monthlyRent)]]} /></Panel>
        </div>
      ) : <EmptyState title="No room allocated yet" message="Visit the hostel office to be allocated a bed." />}
    </QueryGate>
  );
}
