// MOCK REST BACKEND (demo only). Emulates the Spring Boot API contract in
// docs/API.md: JWT-style bearer tokens, hashed passwords, role-based
// authorization (403), validation (400), lockout, and audit logging.
// It runs in the browser and persists to localStorage.
import { buildSeed, type MockDb } from "./seed";
import { can, isSelfScoped, SECURITY_AUDIT_MODULES, type Module, type Permission } from "@/lib/auth/permissions";
import * as v from "@/lib/validation";
import type { AppNotification, AuditLog, Role, User } from "@/lib/types";

const KEY = "lalasalama.mockdb.v1";
let db: MockDb | null = null;
let ready: Promise<MockDb> | null = null;

export class ApiError extends Error {
  constructor(public status: number, message: string, public details?: Record<string, string>) {
    super(message);
  }
}

async function hash(password: string, salt: string) {
  // Stand-in for BCrypt (performed server-side in production).
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(`${salt}:${password}`));
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
}
const salt = () => crypto.getRandomValues(new Uint32Array(2)).join("");

async function load(): Promise<MockDb> {
  if (db) return db;
  if (!ready) {
    ready = (async () => {
      const raw = typeof localStorage !== "undefined" ? localStorage.getItem(KEY) : null;
      if (raw) { db = JSON.parse(raw); return db!; }
      const { seedPasswords, ...rest } = buildSeed();
      const credentials = await Promise.all(seedPasswords.map(async (s) => {
        const sa = salt();
        return { userId: s.userId, salt: sa, passwordHash: await hash(s.password, sa) };
      }));
      db = { ...rest, credentials };
      save();
      return db;
    })();
  }
  return ready;
}
function save() { if (db && typeof localStorage !== "undefined") localStorage.setItem(KEY, JSON.stringify(db)); }
export function resetMockDb() { localStorage.removeItem(KEY); db = null; ready = null; }

const id = (p: string) => `${p}-${Date.now().toString(36).toUpperCase()}${Math.floor(Math.random() * 99)}`;
const nowIso = () => new Date().toISOString();
const device = () => (typeof navigator !== "undefined" ? navigator.userAgent.split(") ")[0].replace("Mozilla/5.0 (", "") : "server");

// ---- tokens ---------------------------------------------------------------
function b64(o: unknown) { return btoa(JSON.stringify(o)).replace(/=+$/, ""); }
function issueToken(u: User, minutes: number) {
  const exp = Date.now() + minutes * 60000;
  return { token: `${b64({ alg: "HS256", typ: "JWT" })}.${b64({ sub: u.id, role: u.role, exp })}.mock-signature`, exp };
}
function verify(token: string | null, d: MockDb): User {
  if (!token) throw new ApiError(401, "Authentication required");
  try {
    const p = JSON.parse(atob(token.split(".")[1]));
    if (p.exp < Date.now()) throw new ApiError(401, "Session expired");
    const u = d.users.find((x) => x.id === p.sub);
    if (!u || u.status !== "Active") throw new ApiError(401, "Account is not active");
    return u;
  } catch (e) {
    if (e instanceof ApiError) throw e;
    throw new ApiError(401, "Invalid token");
  }
}

function audit(d: MockDb, u: User | null, action: string, module: string, description: string, result: AuditLog["result"] = "Success", who?: string) {
  d.auditLogs.unshift({
    id: id("AUD"), userId: u?.id ?? null, user: u?.fullName ?? who ?? "anonymous", role: u?.role ?? "SYSTEM",
    action, module, description, timestamp: nowIso(), ip: "10.0.0.x (placeholder)", device: device(), result,
  });
}
function notify(d: MockDb, n: Omit<AppNotification, "id" | "createdAt" | "readBy" | "userId"> & { userId?: string | null }) {
  d.notifications.unshift({ id: id("NTF"), createdAt: nowIso(), readBy: [], userId: n.userId ?? null, ...n });
}
function parse<T>(schema: { safeParse: (x: unknown) => { success: true; data: T } | { success: false; error: { issues: { path: (string | number)[]; message: string }[] } } }, body: unknown): T {
  const r = schema.safeParse(body);
  if (!r.success) {
    const details: Record<string, string> = {};
    r.error.issues.forEach((i) => { details[String(i.path[0] ?? "form")] = i.message; });
    throw new ApiError(400, "Validation failed", details);
  }
  return r.data;
}

type Col = keyof Pick<MockDb, "residents" | "rooms" | "beds" | "allocations" | "visitors" | "accessLogs" | "incidents" | "complaints" | "maintenance" | "payments" | "staff" | "announcements" | "lostFound" | "emergencyContacts" | "auditLogs" | "users" | "loginAttempts" | "notifications">;
const RESOURCES: Record<string, { col: Col; module: Module; label: string; prefix: string; schema?: unknown }> = {
  residents: { col: "residents", module: "residents", label: "Residents", prefix: "RES", schema: v.residentSchema },
  rooms: { col: "rooms", module: "rooms", label: "Rooms", prefix: "RM", schema: v.roomSchema },
  beds: { col: "beds", module: "beds", label: "Beds", prefix: "BED" },
  allocations: { col: "allocations", module: "allocations", label: "Allocations", prefix: "ALC" },
  visitors: { col: "visitors", module: "visitors", label: "Visitors", prefix: "VIS", schema: v.visitorSchema },
  "access-logs": { col: "accessLogs", module: "access", label: "Access Control", prefix: "ACC", schema: v.accessSchema },
  incidents: { col: "incidents", module: "incidents", label: "Incidents", prefix: "INC", schema: v.incidentSchema },
  complaints: { col: "complaints", module: "complaints", label: "Complaints", prefix: "CMP", schema: v.complaintSchema },
  maintenance: { col: "maintenance", module: "maintenance", label: "Maintenance", prefix: "MNT", schema: v.maintenanceSchema },
  payments: { col: "payments", module: "payments", label: "Payments", prefix: "PAY", schema: v.paymentSchema },
  staff: { col: "staff", module: "staff", label: "Staff", prefix: "STF", schema: v.staffSchema },
  announcements: { col: "announcements", module: "announcements", label: "Announcements", prefix: "ANN", schema: v.announcementSchema },
  "lost-found": { col: "lostFound", module: "lostfound", label: "Lost & Found", prefix: "LF", schema: v.lostFoundSchema },
  "emergency-contacts": { col: "emergencyContacts", module: "emergency", label: "Emergency", prefix: "EMC" },
  "audit-logs": { col: "auditLogs", module: "audit", label: "Audit", prefix: "AUD" },
  users: { col: "users", module: "users", label: "Users", prefix: "USR", schema: v.userSchema },
  "login-attempts": { col: "loginAttempts", module: "audit", label: "Auth", prefix: "LGA" },
  notifications: { col: "notifications", module: "notifications", label: "Notifications", prefix: "NTF" },
};

function guard(d: MockDb, u: User, perm: Permission, what: string) {
  if (!can(u.role, perm)) {
    audit(d, u, perm.split(":")[1].toUpperCase(), what, `Permission denied: ${perm}`, "Denied");
    save();
    throw new ApiError(403, "You do not have permission to perform this action");
  }
}

function syncRoom(d: MockDb, roomId: string) {
  const room = d.rooms.find((r) => r.id === roomId);
  if (!room || room.status === "Maintenance" || room.status === "Closed") return;
  const occ = d.beds.filter((b) => b.roomId === roomId && b.status === "Occupied").length;
  room.status = occ === 0 ? "Available" : occ >= room.capacity ? "Fully Occupied" : "Partially Occupied";
}

function scope<T>(d: MockDb, u: User, res: string, rows: T[]): T[] {
  if (res === "notifications") {
    return (rows as unknown as AppNotification[]).filter((n) => n.userId === u.id || n.audience.includes(u.role)) as unknown as T[];
  }
  if (res === "audit-logs" && u.role === "SECURITY_OFFICER") {
    return (rows as unknown as AuditLog[]).filter((l) => SECURITY_AUDIT_MODULES.includes(l.module)) as unknown as T[];
  }
  if (res === "users" && u.role !== "SUPER_ADMIN") return [];
  if (!isSelfScoped(u.role)) return rows;
  const rid = u.residentId;
  const me = d.residents.find((r) => r.id === rid);
  switch (res) {
    case "residents": return rows.filter((r) => (r as { id: string }).id === rid);
    case "rooms": return rows.filter((r) => (r as { id: string }).id === me?.roomId);
    case "beds": return rows.filter((r) => (r as { roomId: string }).roomId === me?.roomId);
    case "payments": case "visitors": case "complaints": case "maintenance":
      return rows.filter((r) => (r as { residentId: string }).residentId === rid);
    case "incidents": return rows.filter((r) => (r as { reportedByUserId: string }).reportedByUserId === u.id);
    case "allocations": return rows.filter((r) => (r as { residentId: string }).residentId === rid);
    default: return rows;
  }
}

const publicUser = (u: User) => u;

export async function handle(method: string, path: string, body: unknown, token: string | null): Promise<unknown> {
  const d = await load();
  await new Promise((r) => setTimeout(r, 120 + Math.random() * 180)); // simulate latency
  const parts = path.replace(/^\/api\//, "").replace(/\?.*$/, "").split("/").filter(Boolean);
  const [res, rid, sub] = parts;

  // ---- auth --------------------------------------------------------------
  if (res === "auth") {
    if (rid === "login" && method === "POST") {
      const { email, password } = parse(v.loginSchema, body);
      const ident = email.toLowerCase();
      const u = d.users.find((x) => x.email.toLowerCase() === ident || x.username === ident);
      const attempt = (success: boolean, reason: string) =>
        d.loginAttempts.unshift({ id: id("LGA"), email: ident, success, reason, timestamp: nowIso(), ip: "10.0.0.x" });
      const generic = "Invalid email/username or password";
      if (!u) { attempt(false, "Unknown user"); audit(d, null, "LOGIN", "Auth", `Failed login for ${ident}`, "Failure", ident); save(); throw new ApiError(401, generic); }
      if (u.lockedUntil && new Date(u.lockedUntil).getTime() > Date.now()) {
        attempt(false, "Locked"); save();
        throw new ApiError(423, `Account locked after too many failed attempts. Try again after ${new Date(u.lockedUntil).toLocaleTimeString()}.`);
      }
      const cred = d.credentials.find((c) => c.userId === u.id)!;
      if ((await hash(password, cred.salt)) !== cred.passwordHash) {
        u.failedAttempts += 1;
        const left = d.settings.maxLoginAttempts - u.failedAttempts;
        if (left <= 0) {
          u.lockedUntil = new Date(Date.now() + d.settings.lockoutMinutes * 60000).toISOString();
          u.failedAttempts = 0;
          notify(d, { type: "Security Alert", title: "Account locked", message: `${u.fullName}'s account was locked after repeated failed logins.`, audience: ["SUPER_ADMIN"] });
        }
        attempt(false, "Invalid password"); audit(d, u, "LOGIN", "Auth", "Failed login: invalid password", "Failure"); save();
        throw new ApiError(401, left > 0 ? `${generic}. ${left} attempt(s) left before lockout.` : `Account locked for ${d.settings.lockoutMinutes} minutes.`);
      }
      if (u.status !== "Active") { attempt(false, `Status ${u.status}`); save(); throw new ApiError(403, `This account is ${u.status.toLowerCase()}. Contact the hostel administrator.`); }
      u.failedAttempts = 0; u.lockedUntil = null; u.lastLogin = nowIso();
      attempt(true, "OK"); audit(d, u, "LOGIN", "Auth", "User logged in."); save();
      const t = issueToken(u, d.settings.sessionTimeoutMinutes);
      return { token: t.token, expiresAt: t.exp, user: publicUser(u) };
    }
    if (rid === "forgot-password") { return { ok: true, message: "If the account exists, a reset link has been sent." }; }
    if (rid === "reset-password") { parse(v.passwordSchema, (body as { password: string })?.password); return { ok: true }; }
    const u = verify(token, d);
    if (rid === "logout") { audit(d, u, "LOGOUT", "Auth", "User logged out."); save(); return { ok: true }; }
    if (rid === "me") return publicUser(u);
    if (rid === "refresh") { const t = issueToken(u, d.settings.sessionTimeoutMinutes); return { token: t.token, expiresAt: t.exp, user: u }; }
    if (rid === "change-password") {
      const b = parse(v.changePasswordSchema, body);
      const cred = d.credentials.find((c) => c.userId === u.id)!;
      if ((await hash(b.currentPassword, cred.salt)) !== cred.passwordHash) throw new ApiError(400, "Current password is incorrect", { currentPassword: "Incorrect password" });
      cred.salt = salt(); cred.passwordHash = await hash(b.newPassword, cred.salt);
      audit(d, u, "PASSWORD_CHANGE", "Auth", "User changed password."); save();
      return { ok: true };
    }
    throw new ApiError(404, "Not found");
  }

  const u = verify(token, d);

  if (res === "settings") {
    if (method === "GET") { guard(d, u, "settings:read", "Settings"); return d.settings; }
    guard(d, u, "settings:update", "Settings");
    d.settings = parse(v.settingsSchema, body);
    audit(d, u, "UPDATE", "Settings", "Updated security settings."); save();
    return d.settings;
  }

  if (res === "emergency-alerts" && method === "POST") {
    if (!["SUPER_ADMIN", "HOSTEL_ADMIN", "SECURITY_OFFICER"].includes(u.role)) throw new ApiError(403, "Not allowed");
    const b = parse(v.emergencyAlertSchema, body);
    notify(d, { type: "Security Alert", title: `EMERGENCY: ${b.title}`, message: b.message, audience: ["SUPER_ADMIN", "HOSTEL_ADMIN", "SECURITY_OFFICER", "RESIDENT"] });
    audit(d, u, "ALERT", "Emergency", `Broadcast emergency alert '${b.title}' via ${b.channels.join(", ")} (SMS/Email pending integration).`);
    save();
    return { ok: true, queued: b.channels };
  }

  const R = RESOURCES[res];
  if (!R) throw new ApiError(404, `Unknown endpoint /api/${parts.join("/")}`);
  const rows = d[R.col] as unknown as { id: string }[];

  // ---- special actions ---------------------------------------------------
  if (res === "notifications" && method === "POST") {
    const mine = scope(d, u, res, d.notifications);
    for (const n of mine) if ((rid === "read-all" || n.id === rid) && !n.readBy.includes(u.id)) n.readBy.push(u.id);
    save(); return { ok: true };
  }

  if (res === "visitors" && sub && method === "POST") {
    guard(d, u, "visitors:update", R.label);
    const vis = d.visitors.find((x) => x.id === rid);
    if (!vis) throw new ApiError(404, "Visitor not found");
    const host = d.residents.find((r) => r.id === vis.residentId);
    const flow: Record<string, () => void> = {
      approve: () => { if (vis.status !== "Pending") throw new ApiError(409, "Only pending visitors can be approved"); vis.status = "Approved"; vis.passNo = `LS-VP-${Math.floor(100000 + Math.random() * 899999)}`; vis.officer = u.fullName; },
      deny: () => { vis.status = "Denied"; vis.officer = u.fullName; },
      "check-in": () => {
        if (vis.status === "Blacklisted" || vis.status === "Denied") throw new ApiError(409, "Visitor is not permitted entry");
        if (vis.status === "Pending") throw new ApiError(409, "Approve the visitor before check-in");
        vis.status = "Checked In"; vis.checkIn = nowIso(); vis.officer = u.fullName;
        d.accessLogs.unshift({ id: id("ACC"), person: vis.fullName, personType: "Visitor", reference: vis.passNo ?? vis.id, entryTime: nowIso(), exitTime: null, gate: "Gate A", officer: u.fullName, purpose: vis.purpose, status: "Granted" });
        const hostUser = d.users.find((x) => x.residentId === vis.residentId);
        notify(d, { type: "Visitor Arrival", title: "Your visitor has arrived", message: `${vis.fullName} checked in at Gate A.`, audience: [], userId: hostUser?.id ?? null });
      },
      "check-out": () => {
        if (vis.status !== "Checked In") throw new ApiError(409, "Visitor is not checked in");
        vis.status = "Checked Out"; vis.checkOut = nowIso();
        const log = d.accessLogs.find((l) => l.personType === "Visitor" && l.person === vis.fullName && !l.exitTime);
        if (log) log.exitTime = nowIso();
        notify(d, { type: "Visitor Checkout", title: "Visitor checked out", message: `${vis.fullName} left the hostel.`, audience: ["SECURITY_OFFICER"] });
      },
      blacklist: () => { vis.status = "Blacklisted"; vis.flagged = true; notify(d, { type: "Security Alert", title: "Visitor blacklisted", message: `${vis.fullName} (${vis.idNumber}) was blacklisted.`, audience: ["SUPER_ADMIN", "HOSTEL_ADMIN", "SECURITY_OFFICER"] }); },
      flag: () => { vis.flagged = !vis.flagged; },
    };
    if (!flow[sub]) throw new ApiError(404, "Unknown action");
    flow[sub]();
    audit(d, u, sub.toUpperCase().replace("-", "_"), "Visitors", `${u.role === "SECURITY_OFFICER" ? "Security Officer" : "Administrator"} ${sub.replace("-", " ")} visitor ${vis.fullName}${host ? ` (host ${host.fullName})` : ""}.`);
    save(); return vis;
  }

  if (res === "access-logs" && sub === "exit" && method === "POST") {
    guard(d, u, "access:update", R.label);
    const log = d.accessLogs.find((l) => l.id === rid);
    if (!log) throw new ApiError(404, "Log not found");
    if (log.exitTime) throw new ApiError(409, "Exit already recorded");
    log.exitTime = nowIso();
    audit(d, u, "EXIT", "Access Control", `Recorded exit for ${log.person} at ${log.gate}.`); save();
    return log;
  }

  if (res === "users" && sub && method === "POST") {
    guard(d, u, "users:update", "Users");
    const target = d.users.find((x) => x.id === rid);
    if (!target) throw new ApiError(404, "User not found");
    if (sub === "reset-password") {
      const temp = `Tmp-${Math.random().toString(36).slice(2, 8)}A1!`;
      const cred = d.credentials.find((c) => c.userId === target.id)!;
      cred.salt = salt(); cred.passwordHash = await hash(temp, cred.salt);
      audit(d, u, "RESET_PASSWORD", "Users", `Reset password for ${target.fullName}.`); save();
      return { temporaryPassword: temp };
    }
    if (sub === "unlock") { target.lockedUntil = null; target.failedAttempts = 0; audit(d, u, "UNLOCK", "Users", `Unlocked ${target.fullName}.`); save(); return target; }
    throw new ApiError(404, "Unknown action");
  }

  // ---- generic CRUD ------------------------------------------------------
  if (method === "GET" && !rid) {
    guard(d, u, `${R.module}:read` as Permission, R.label);
    return scope(d, u, res, rows);
  }
  if (method === "GET" && rid) {
    guard(d, u, `${R.module}:read` as Permission, R.label);
    const row = scope(d, u, res, rows).find((x) => x.id === rid);
    if (!row) throw new ApiError(404, "Record not found");
    return row;
  }
  if (res === "audit-logs" || res === "login-attempts") throw new ApiError(405, "Audit records are immutable");

  if (method === "POST") {
    guard(d, u, `${R.module}:create` as Permission, R.label);
    if (res === "allocations") {
      const b = parse(v.allocationSchema, body);
      const bed = d.beds.find((x) => x.id === b.bedId);
      const resident = d.residents.find((x) => x.id === b.residentId);
      if (!bed || !resident) throw new ApiError(404, "Bed or resident not found");
      if (bed.status !== "Available" && bed.status !== "Reserved") throw new ApiError(409, `Bed ${bed.id} is ${bed.status.toLowerCase()} and cannot be allocated`);
      const room = d.rooms.find((r) => r.id === bed.roomId)!;
      if (room.status === "Maintenance" || room.status === "Closed") throw new ApiError(409, `Room ${room.number} is ${room.status.toLowerCase()}`);
      if (resident.bedId) {
        const old = d.beds.find((x) => x.id === resident.bedId);
        if (old) { old.status = "Available"; old.residentId = null; syncRoom(d, old.roomId); }
        const oa = d.allocations.find((a) => a.residentId === resident.id && !a.endedAt);
        if (oa) oa.endedAt = nowIso();
      }
      bed.status = "Occupied"; bed.residentId = resident.id;
      resident.roomId = room.id; resident.bedId = bed.id;
      syncRoom(d, room.id);
      const a = { id: id("ALC"), residentId: resident.id, roomId: room.id, bedId: bed.id, allocatedAt: nowIso(), allocatedBy: u.fullName, endedAt: null };
      d.allocations.unshift(a);
      audit(d, u, "ALLOCATE", "Allocations", `Administrator allocated ${resident.fullName} to Room ${room.number} Bed ${bed.number}.`); save();
      return a;
    }
    if (res === "payments") {
      const b = parse(v.paymentSchema, body);
      const resident = d.residents.find((r) => r.id === b.residentId);
      if (!resident) throw new ApiError(404, "Resident not found");
      const p = d.payments.find((x) => x.residentId === b.residentId && x.period === b.period);
      if (d.payments.some((x) => x.reference && x.reference === b.reference)) throw new ApiError(409, "Duplicate transaction reference", { reference: "Reference already used" });
      const rent = d.rooms.find((r) => r.id === resident.roomId)?.monthlyRent ?? 6000;
      const target = p ?? { id: id("PAY"), residentId: b.residentId, amountDue: rent, amountPaid: 0, method: null, reference: "", paidAt: null, dueDate: `${b.period}-05T00:00:00.000Z`, period: b.period, status: "Pending" as const };
      if (!p) d.payments.unshift(target);
      target.amountPaid = Math.min(target.amountDue, target.amountPaid + b.amountPaid);
      target.method = b.method; target.reference = b.reference; target.paidAt = nowIso();
      target.status = target.amountPaid >= target.amountDue ? "Paid" : "Partially Paid";
      audit(d, u, "CREATE", "Payments", `Recorded ${b.method} payment KES ${b.amountPaid.toLocaleString()} for ${resident.id} (${b.reference}).`); save();
      return target;
    }
    const data = parse(R.schema as Parameters<typeof parse>[0], body) as Record<string, unknown>;
    let row: Record<string, unknown> = { id: id(R.prefix), ...data };
    const me = u.residentId ? d.residents.find((r) => r.id === u.residentId) : null;
    if (res === "residents") row = { ...row, id: `RES-${1000 + d.residents.length + 1}`, roomId: null, bedId: null, registeredAt: nowIso(), photo: null };
    if (res === "rooms") {
      if (d.rooms.some((r) => r.number === data.number)) throw new ApiError(409, "Room number already exists", { number: "Already exists" });
      row = { ...row, id: id("RM") };
      for (let i = 0; i < Number(data.capacity); i++) d.beds.push({ id: `BED-${data.number}-${"ABCDEFGH"[i]}`, number: "ABCDEFGH"[i], roomId: String(row.id), status: "Available", residentId: null });
    }
    if (res === "visitors") {
      const residentId = u.role === "RESIDENT" ? u.residentId! : String(data.residentId);
      const blk = d.visitors.find((x) => x.idNumber === data.idNumber && x.status === "Blacklisted");
      row = { ...row, residentId, status: blk ? "Denied" : "Pending", checkIn: null, checkOut: null, officer: u.role === "RESIDENT" ? null : u.fullName, flagged: !!blk, passNo: null, createdAt: nowIso() };
      notify(d, { type: blk ? "Security Alert" : "Visitor Approval", title: blk ? "Blacklisted visitor attempted registration" : "Visitor awaiting approval", message: `${data.fullName} — ${data.purpose}`, audience: ["SECURITY_OFFICER", "HOSTEL_ADMIN"] });
    }
    if (res === "access-logs") row = { ...row, entryTime: nowIso(), exitTime: null, officer: u.fullName };
    if (res === "incidents") {
      const n = `INC-${new Date().getFullYear()}-${String(140 + d.incidents.length + 1).padStart(4, "0")}`;
      row = { ...row, number: n, reportedBy: u.fullName, reportedByUserId: u.id, residentId: u.residentId ?? null, assignedOfficer: null, status: "Reported", resolution: "", resolvedAt: null, createdAt: nowIso() };
      notify(d, { type: "Incident Alert", title: `${data.severity} incident reported`, message: `${data.type} at ${data.location} (${n}).`, audience: ["SUPER_ADMIN", "HOSTEL_ADMIN", "SECURITY_OFFICER"] });
    }
    if (res === "complaints") row = { ...row, residentId: me?.id ?? (body as { residentId?: string }).residentId ?? "", submittedAt: nowIso(), assignedStaff: null, status: "Submitted", resolution: "" };
    if (res === "maintenance") row = { ...row, residentId: me?.id ?? (body as { residentId?: string }).residentId ?? "", roomId: me?.roomId ?? null, createdAt: nowIso(), technician: null, status: "Pending", resolution: "" };
    if (res === "announcements") {
      row = { ...row, publishedBy: u.fullName, publishedAt: nowIso() };
      notify(d, { type: "Announcement", title: String(data.title), message: String(data.message).slice(0, 120), audience: ["RESIDENT", "SECURITY_OFFICER", "HOSTEL_ADMIN", "SUPER_ADMIN"] });
    }
    if (res === "lost-found") row = { ...row, foundAt: nowIso(), foundBy: u.fullName, status: "Unclaimed", claimedBy: null, claimedAt: null, image: null };
    if (res === "staff") row = { ...row, joinedAt: nowIso(), photo: null };
    if (res === "users") {
      if (d.users.some((x) => x.email === data.email || x.username === data.username)) throw new ApiError(409, "Email or username already in use");
      row = { ...row, lastLogin: null, createdAt: nowIso(), failedAttempts: 0, lockedUntil: null };
      const sa = salt(); const temp = `Tmp-${Math.random().toString(36).slice(2, 8)}A1!`;
      d.credentials.push({ userId: String(row.id), salt: sa, passwordHash: await hash(temp, sa) });
      row.temporaryPassword = temp;
    }
    const { temporaryPassword, ...stored } = row;
    rows.unshift(stored as { id: string });
    audit(d, u, "CREATE", R.label, `${labelFor(u.role)} created ${R.label.toLowerCase()} record ${String(row.number ?? row.id)}.`);
    save();
    return temporaryPassword ? { ...stored, temporaryPassword } : stored;
  }

  if (method === "PUT" && rid) {
    guard(d, u, `${R.module}:update` as Permission, R.label);
    const row = rows.find((x) => x.id === rid) as Record<string, unknown> | undefined;
    if (!row) throw new ApiError(404, "Record not found");
    const b = (body ?? {}) as Record<string, unknown>;
    let patch: Record<string, unknown>;
    if (res === "incidents") {
      patch = parse(v.incidentUpdateSchema, b);
      if ((patch.status === "Resolved" || patch.status === "Closed") && !row.resolvedAt) patch.resolvedAt = nowIso();
      if (patch.status === "Escalated") notify(d, { type: "Incident Alert", title: "Incident escalated", message: `${row.number} was escalated.`, audience: ["SUPER_ADMIN", "HOSTEL_ADMIN"] });
    } else if (res === "complaints" || res === "maintenance") {
      const w = parse(v.workUpdateSchema, b);
      patch = { status: w.status, resolution: w.resolution, [res === "complaints" ? "assignedStaff" : "technician"]: w.assignee || null };
      if (res === "maintenance") {
        const hostUser = d.users.find((x) => x.residentId === row.residentId);
        notify(d, { type: "Maintenance Update", title: `Maintenance ${w.status.toLowerCase()}`, message: `${row.category} request ${row.id} is now ${w.status}.`, audience: [], userId: hostUser?.id ?? null });
      }
    } else if (res === "lost-found") {
      patch = { status: b.status, claimedBy: b.claimedBy ?? null, claimedAt: b.status === "Unclaimed" ? null : nowIso() };
    } else if (res === "users") {
      if (rid === u.id && b.role && b.role !== u.role) throw new ApiError(409, "You cannot change your own role");
      patch = parse(v.userSchema, b);
    } else if (res === "beds") {
      patch = { status: b.status };
      if (row.status === "Occupied") throw new ApiError(409, "Release the resident from this bed first");
    } else if (R.schema) {
      patch = parse(R.schema as Parameters<typeof parse>[0], b) as Record<string, unknown>;
    } else throw new ApiError(405, "Not editable");
    Object.assign(row, patch);
    if (res === "beds") syncRoom(d, String(row.roomId));
    audit(d, u, "UPDATE", R.label, `${labelFor(u.role)} updated ${R.label === "Residents" ? "Resident #" : `${R.label.toLowerCase()} `}${String(row.number ?? row.id)}.`);
    save();
    return row;
  }

  if (method === "DELETE" && rid) {
    guard(d, u, `${R.module}:delete` as Permission, R.label);
    const idx = rows.findIndex((x) => x.id === rid);
    if (idx < 0) throw new ApiError(404, "Record not found");
    if (res === "residents") {
      // Soft-delete: deactivate and release bed (keeps history for audit).
      const r = d.residents[idx];
      r.status = "Checked Out";
      const bed = d.beds.find((b) => b.id === r.bedId);
      if (bed) { bed.status = "Available"; bed.residentId = null; syncRoom(d, bed.roomId); }
      const a = d.allocations.find((x) => x.residentId === r.id && !x.endedAt);
      if (a) a.endedAt = nowIso();
      r.bedId = null; r.roomId = null;
      audit(d, u, "DEACTIVATE", "Residents", `Administrator deactivated Resident #${r.id}.`); save();
      return r;
    }
    if (res === "users") {
      if (rid === u.id) throw new ApiError(409, "You cannot revoke your own access");
      const t = d.users[idx]; t.status = "Disabled";
      audit(d, u, "REVOKE", "Users", `Revoked access for ${t.fullName}.`); save();
      return t;
    }
    if (res === "rooms" && d.beds.some((b) => b.roomId === rid && b.status === "Occupied")) throw new ApiError(409, "Room has occupants");
    const [removed] = rows.splice(idx, 1);
    if (res === "rooms") d.beds = d.beds.filter((b) => b.roomId !== rid);
    audit(d, u, "DELETE", R.label, `${labelFor(u.role)} deleted ${R.label.toLowerCase()} record ${rid}.`); save();
    return removed;
  }

  throw new ApiError(405, "Method not allowed");
}

function labelFor(role: Role) {
  return role === "SECURITY_OFFICER" ? "Security Officer" : role === "RESIDENT" ? "Resident" : "Administrator";
}
