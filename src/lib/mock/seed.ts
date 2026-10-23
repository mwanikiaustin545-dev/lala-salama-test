// DEMO / SAMPLE DATA ONLY. Deterministically generated so the dashboards look
// complete on first load. Replace by connecting the real Spring Boot API
// (set VITE_API_BASE_URL) — nothing in the UI depends on this file directly.
import type {
  AccessLog, Allocation, Announcement, AppNotification, AuditLog, Bed, Complaint, EmergencyContact,
  Incident, LoginAttempt, LostFoundItem, MaintenanceRequest, Payment, Resident, Room, Staff,
  SystemSettings, User, Visitor,
} from "@/lib/types";

export interface MockDb {
  version: number;
  users: User[];
  credentials: { userId: string; passwordHash: string; salt: string }[];
  residents: Resident[];
  rooms: Room[];
  beds: Bed[];
  allocations: Allocation[];
  visitors: Visitor[];
  accessLogs: AccessLog[];
  incidents: Incident[];
  complaints: Complaint[];
  maintenance: MaintenanceRequest[];
  payments: Payment[];
  staff: Staff[];
  notifications: AppNotification[];
  announcements: Announcement[];
  lostFound: LostFoundItem[];
  emergencyContacts: EmergencyContact[];
  auditLogs: AuditLog[];
  loginAttempts: LoginAttempt[];
  settings: SystemSettings;
}

export const DEMO_ACCOUNTS = [
  { role: "Super Admin", email: "admin@lalasalama.ac.ke", password: "Admin@2026!" },
  { role: "Hostel Administrator", email: "manager@lalasalama.ac.ke", password: "Manager@2026!" },
  { role: "Security Officer", email: "security@lalasalama.ac.ke", password: "Security@2026!" },
  { role: "Resident", email: "resident@lalasalama.ac.ke", password: "Resident@2026!" },
] as const;

function rng(seed: number) {
  return () => {
    seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function buildSeed(): Omit<MockDb, "credentials"> & { seedPasswords: { userId: string; password: string }[] } {
  const r = rng(20261001);
  const pick = <T,>(a: readonly T[]): T => a[Math.floor(r() * a.length)];
  const int = (a: number, b: number) => a + Math.floor(r() * (b - a + 1));
  const now = Date.now();
  const at = (daysAgo: number, h = int(7, 21), m = int(0, 59)) => {
    const d = new Date(now - daysAgo * 86400000);
    d.setHours(h, m, 0, 0);
    return d.toISOString();
  };
  const pad = (n: number, l = 4) => String(n).padStart(l, "0");

  const first = {
    Male: ["Brian", "Kevin", "Dennis", "Samuel", "Peter", "James", "Collins", "Victor", "Moses", "Ian", "Allan", "Felix", "Joseph", "Eric", "Mark"],
    Female: ["Grace", "Faith", "Mercy", "Wanjiru", "Achieng", "Linet", "Esther", "Joy", "Cynthia", "Sharon", "Ann", "Mary", "Purity", "Naomi", "Diana"],
  };
  const last = ["Otieno", "Mwangi", "Kamau", "Odhiambo", "Kiptoo", "Njoroge", "Wanjiku", "Chebet", "Mutua", "Ochieng", "Kariuki", "Onyango", "Wekesa", "Kimani", "Nyambura", "Barasa", "Rotich", "Maina"];
  const courses = [
    ["BSc Information Technology", "Computing & IT"], ["BSc Computer Science", "Computing & IT"],
    ["BSc Cyber Security", "Computing & IT"], ["BCom Finance", "Business"], ["BA Economics", "Business"],
    ["BSc Nursing", "Health Sciences"], ["BEd Arts", "Education"], ["BSc Civil Engineering", "Engineering"],
    ["LLB Law", "Law"], ["BSc Electrical Engineering", "Engineering"],
  ] as const;

  // Rooms & beds
  const rooms: Room[] = [];
  const beds: Bed[] = [];
  const blocks = ["A", "B", "C", "D"];
  const typeCap = { Single: 1, Double: 2, Triple: 3, Shared: 4 } as const;
  const types = ["Single", "Double", "Double", "Triple", "Shared", "Shared"] as const;
  let rIdx = 0;
  for (const block of blocks) {
    for (let f = 1; f <= 2; f++) {
      for (let n = 1; n <= 3; n++) {
        rIdx++;
        const type = pick(types);
        const room: Room = {
          id: `RM-${pad(rIdx, 3)}`, number: `${block}${f}0${n}`, block, floor: f, type,
          capacity: typeCap[type], status: "Available",
          monthlyRent: { Single: 9000, Double: 7000, Triple: 6000, Shared: 5000 }[type],
        };
        rooms.push(room);
        for (let b = 0; b < room.capacity; b++) {
          beds.push({ id: `BED-${room.number}-${"ABCD"[b]}`, number: "ABCD"[b], roomId: room.id, status: "Available", residentId: null });
        }
      }
    }
  }
  rooms[5].status = "Maintenance";
  rooms[17].status = "Closed";

  // Residents
  const residents: Resident[] = [];
  const allocations: Allocation[] = [];
  const freeBeds = beds.filter((b) => {
    const room = rooms.find((x) => x.id === b.roomId)!;
    return room.status !== "Maintenance" && room.status !== "Closed";
  });
  for (let i = 0; i < 56; i++) {
    const gender = i % 2 === 0 ? "Male" : "Female";
    const fn = i === 0 ? "Amina" : pick(first[gender]);
    const ln = i === 0 ? "Wanjiru" : pick(last);
    const [course, department] = pick(courses);
    const statusRoll = r();
    const status: Resident["status"] =
      i < 48 ? "Active" : statusRoll < 0.4 ? "Checked Out" : statusRoll < 0.6 ? "Suspended" : statusRoll < 0.8 ? "Graduated" : "Expelled";
    const reg = at(int(20, 380));
    const res: Resident = {
      id: `RES-${1000 + i + 1}`,
      admissionNo: `${pick(["SCT", "BUS", "HSC", "EDU", "ENG"])}/${int(2021, 2025)}/${pad(int(100, 9999))}`,
      fullName: `${fn} ${ln}`, gender: i === 0 ? "Female" : gender,
      dob: `${int(1999, 2006)}-${pad(int(1, 12), 2)}-${pad(int(1, 28), 2)}`,
      phone: `+254 7${int(10, 99)} ${int(100, 999)} ${int(100, 999)}`,
      email: i === 0 ? "resident@lalasalama.ac.ke" : `${fn.toLowerCase()}.${ln.toLowerCase()}${i}@students.ac.ke`,
      course, department, yearOfStudy: int(1, 4),
      emergencyName: `${pick(first.Female)} ${ln}`, emergencyPhone: `+254 7${int(10, 99)} ${int(100, 999)} ${int(100, 999)}`,
      roomId: null, bedId: null, registeredAt: reg, status, photo: null,
    };
    if (status === "Active" && i < freeBeds.length) {
      const bed = freeBeds[i];
      bed.status = "Occupied"; bed.residentId = res.id;
      res.roomId = bed.roomId; res.bedId = bed.id;
      allocations.push({ id: `ALC-${pad(i + 1)}`, residentId: res.id, roomId: bed.roomId, bedId: bed.id, allocatedAt: reg, allocatedBy: "Ruth Kamau", endedAt: null });
    }
    residents.push(res);
  }
  // A couple of reserved / maintenance beds
  const avail = beds.filter((b) => b.status === "Available");
  if (avail[0]) avail[0].status = "Reserved";
  if (avail[3]) avail[3].status = "Maintenance";
  for (const room of rooms) {
    if (room.status === "Maintenance" || room.status === "Closed") continue;
    const occ = beds.filter((b) => b.roomId === room.id && b.status === "Occupied").length;
    room.status = occ === 0 ? "Available" : occ >= room.capacity ? "Fully Occupied" : "Partially Occupied";
  }
  const active = residents.filter((x) => x.roomId);

  // Users
  const users: User[] = [
    { id: "USR-001", fullName: "Daniel Mutiso", email: "admin@lalasalama.ac.ke", phone: "+254 711 000 001", username: "dmutiso", role: "SUPER_ADMIN", status: "Active", lastLogin: at(1, 8, 2), createdAt: at(400), failedAttempts: 0, lockedUntil: null },
    { id: "USR-002", fullName: "Ruth Kamau", email: "manager@lalasalama.ac.ke", phone: "+254 711 000 002", username: "rkamau", role: "HOSTEL_ADMIN", status: "Active", lastLogin: at(0, 7, 45), createdAt: at(380), failedAttempts: 0, lockedUntil: null, staffId: "STF-002" },
    { id: "USR-003", fullName: "Moses Kiptoo", email: "security@lalasalama.ac.ke", phone: "+254 711 000 003", username: "mkiptoo", role: "SECURITY_OFFICER", status: "Active", lastLogin: at(0, 6, 55), createdAt: at(300), failedAttempts: 0, lockedUntil: null, staffId: "STF-003" },
    { id: "USR-004", fullName: residents[0].fullName, email: "resident@lalasalama.ac.ke", phone: residents[0].phone, username: "awanjiru", role: "RESIDENT", status: "Active", lastLogin: at(2, 19, 10), createdAt: residents[0].registeredAt, failedAttempts: 0, lockedUntil: null, residentId: residents[0].id },
    { id: "USR-005", fullName: "Peter Njoroge", email: "p.njoroge@lalasalama.ac.ke", phone: "+254 711 000 005", username: "pnjoroge", role: "SECURITY_OFFICER", status: "Active", lastLogin: at(0, 18, 3), createdAt: at(250), failedAttempts: 0, lockedUntil: null, staffId: "STF-004" },
    { id: "USR-006", fullName: "Lucy Chebet", email: "l.chebet@lalasalama.ac.ke", phone: "+254 711 000 006", username: "lchebet", role: "HOSTEL_ADMIN", status: "Suspended", lastLogin: at(40), createdAt: at(200), failedAttempts: 5, lockedUntil: null },
    { id: "USR-007", fullName: residents[1].fullName, email: residents[1].email, phone: residents[1].phone, username: "resident2", role: "RESIDENT", status: "Disabled", lastLogin: at(90), createdAt: residents[1].registeredAt, failedAttempts: 0, lockedUntil: null, residentId: residents[1].id },
  ];
  const seedPasswords = [
    { userId: "USR-001", password: "Admin@2026!" }, { userId: "USR-002", password: "Manager@2026!" },
    { userId: "USR-003", password: "Security@2026!" }, { userId: "USR-004", password: "Resident@2026!" },
    { userId: "USR-005", password: "Security@2026!" }, { userId: "USR-006", password: "Manager@2026!" },
    { userId: "USR-007", password: "Resident@2026!" },
  ];

  // Staff
  const staffSeed: [string, Staff["role"], string][] = [
    ["Daniel Mutiso", "Manager", "Management"], ["Ruth Kamau", "Administrator", "Administration"],
    ["Moses Kiptoo", "Security Officer", "Security"], ["Peter Njoroge", "Security Officer", "Security"],
    ["Hassan Abdi", "Security Officer", "Security"], ["Janet Akinyi", "Security Officer", "Security"],
    ["Joseph Wafula", "Maintenance Technician", "Facilities"], ["Tom Ouma", "Maintenance Technician", "Facilities"],
    ["Agnes Moraa", "Cleaner", "Housekeeping"], ["Rose Atieno", "Cleaner", "Housekeeping"],
    ["Paul Kibet", "Maintenance Technician", "Facilities"], ["Lucy Chebet", "Administrator", "Administration"],
    ["Esther Nduta", "Cleaner", "Housekeeping"], ["George Omondi", "Security Officer", "Security"],
  ];
  const staff: Staff[] = staffSeed.map(([fullName, role, department], i) => ({
    id: `STF-${pad(i + 1, 3)}`, fullName, role, department,
    phone: `+254 72${i} ${int(100, 999)} ${int(100, 999)}`,
    email: `${fullName.split(" ")[0].toLowerCase()}.${fullName.split(" ")[1].toLowerCase()}@lalasalama.ac.ke`,
    status: i === 12 ? "On Leave" : "Active", joinedAt: at(int(100, 1200)), photo: null,
  }));
  const officers = staff.filter((s) => s.role === "Security Officer").map((s) => s.fullName);
  const techs = staff.filter((s) => s.role === "Maintenance Technician").map((s) => s.fullName);

  // Visitors
  const vNames = ["John Doe", "Brian Otieno", "Grace Achieng", "Samuel Kip", "Mary Wairimu", "Ali Hassan", "Nancy Kerubo", "David Ruto", "Lilian Auma", "Tony Gitau", "Beatrice Nekesa", "Omar Said", "Caroline Muthoni", "Patrick Langat"];
  const vStatus: Visitor["status"][] = ["Checked In", "Checked In", "Checked In", "Checked In", "Pending", "Pending", "Approved", "Checked Out", "Checked Out", "Checked Out", "Checked Out", "Denied", "Blacklisted", "Checked Out"];
  const visitors: Visitor[] = vNames.map((fullName, i) => {
    const st = vStatus[i];
    const day = st === "Checked Out" ? int(0, 6) : 0;
    const ci = st === "Checked In" || st === "Checked Out" ? at(day, int(8, 13)) : null;
    const host = i === 0 || i === 7 ? residents[0] : pick(active);
    return {
      id: `VIS-${pad(i + 1)}`, fullName, idType: pick(["National ID", "National ID", "Passport", "Student ID"] as const),
      idNumber: `${int(20000000, 39999999)}`, phone: `+254 7${int(10, 99)} ${int(100, 999)} ${int(100, 999)}`,
      residentId: host.id, relationship: pick(["Parent", "Sibling", "Friend", "Classmate", "Guardian", "Cousin"]),
      purpose: pick(["Family visit", "Group study", "Dropping off items", "Social visit", "Project discussion"]),
      vehicleReg: r() < 0.3 ? `K${pick(["CA", "CB", "DA", "DE"])} ${int(100, 999)}${pick(["A", "K", "M", "X"])}` : "",
      checkIn: ci, expectedCheckOut: ci ? new Date(new Date(ci).getTime() + 3 * 3600000).toISOString() : at(0, 18, 0),
      checkOut: st === "Checked Out" && ci ? new Date(new Date(ci).getTime() + int(1, 3) * 3600000).toISOString() : null,
      status: st, officer: st === "Pending" ? null : pick(officers), flagged: st === "Blacklisted",
      passNo: ["Approved", "Checked In", "Checked Out"].includes(st) ? `LS-VP-${int(100000, 999999)}` : null,
      createdAt: ci ?? at(0, int(8, 11)),
    };
  });

  // Access logs
  const accessLogs: AccessLog[] = [];
  for (let i = 0; i < 48; i++) {
    const type = pick(["Resident", "Resident", "Resident", "Visitor", "Staff", "Contractor", "Delivery Personnel"] as const);
    const day = i < 18 ? 0 : int(1, 7);
    const entry = at(day, int(6, 20));
    const denied = r() < 0.1;
    const inside = day === 0 && r() < 0.45 && !denied;
    const res = pick(active);
    accessLogs.push({
      id: `ACC-${pad(i + 1, 5)}`,
      person: type === "Resident" ? res.fullName : type === "Visitor" ? pick(vNames) : type === "Staff" ? pick(staff).fullName : type === "Contractor" ? pick(["Kenya Power Tech", "Safaricom Fibre Crew", "AquaFix Plumbers"]) : pick(["Glovo Rider", "Jumia Courier", "Uber Eats Rider"]),
      personType: type, reference: type === "Resident" ? res.id : `ID-${int(20000000, 39999999)}`,
      entryTime: entry, exitTime: denied || inside ? null : new Date(new Date(entry).getTime() + int(20, 400) * 60000).toISOString(),
      gate: pick(["Gate A", "Gate A", "Gate B", "Service Gate"] as const), officer: pick(officers),
      purpose: type === "Resident" ? "Return to hostel" : type === "Delivery Personnel" ? "Parcel delivery" : type === "Contractor" ? "Scheduled works" : "Visit",
      status: denied ? "Denied" : "Granted",
    });
  }
  accessLogs.sort((a, b) => b.entryTime.localeCompare(a.entryTime));

  // Incidents
  const incTypes = ["Theft", "Unauthorized Access", "Noise Complaint", "Suspicious Activity", "Property Damage", "Fire", "Harassment", "Noise Complaint", "Theft", "Suspicious Activity", "Assault", "Other", "Unauthorized Access", "Missing Person"] as const;
  const incStatus = ["Reported", "Under Investigation", "Resolved", "Closed", "Escalated", "Resolved", "Under Investigation", "Closed", "Resolved", "Reported", "Closed", "Resolved", "Reported", "Closed"] as const;
  const sev = ["High", "Critical", "Low", "Medium", "Medium", "Critical", "High", "Low", "Medium", "Medium", "High", "Low", "High", "Critical"] as const;
  const incidents: Incident[] = incTypes.map((type, i) => {
    const status = incStatus[i];
    const created = at(i === 0 ? 0 : int(0, 60));
    const reporter = i % 3 === 0 ? residents[0] : pick(active);
    return {
      id: `INC-${pad(i + 1)}`, number: `INC-2026-${pad(140 + i)}`, type, occurredAt: created,
      location: pick(["Block A corridor", "Gate B", "Block C common room", "Parking lot", "Laundry room", "Block D stairwell", "Cafeteria"]),
      reportedBy: i % 2 === 0 ? reporter.fullName : pick(officers), reportedByUserId: i % 3 === 0 ? "USR-004" : "USR-003",
      residentId: i % 2 === 0 ? reporter.id : null,
      peopleInvolved: r() < 0.5 ? `${pick(active).fullName}` : "Unknown", witnesses: r() < 0.5 ? pick(active).fullName : "",
      description: {
        Theft: "Laptop reported missing from room after resident returned from class. Door showed no forced entry.",
        "Unauthorized Access": "Individual attempted to tailgate a resident through Gate B without presenting ID.",
        "Noise Complaint": "Loud music past curfew reported by multiple residents on the floor.",
        "Suspicious Activity": "Unknown person loitering near the bicycle rack and photographing the gate.",
        "Property Damage": "Window in common room found shattered in the morning.",
        Fire: "Smoke detected from an unattended electric cooker in a room. Extinguished by officers.",
        Harassment: "Resident reported repeated unwanted messages and approaches by a non-resident.",
        Assault: "Altercation between two individuals outside the cafeteria; minor injuries.",
        "Missing Person": "Resident not seen for 48 hours; family unable to reach them.",
        Other: "Power outage caused gate access system to fail for 20 minutes.",
      }[type],
      severity: sev[i], evidence: r() < 0.4 ? ["cctv-snapshot.jpg"] : [],
      assignedOfficer: status === "Reported" ? null : pick(officers), status,
      resolution: status === "Resolved" || status === "Closed" ? "Matter investigated and resolved; parties counselled and report filed." : "",
      resolvedAt: status === "Resolved" || status === "Closed" ? created : null, createdAt: created,
    };
  });

  // Complaints
  const cCat = ["Security", "Noise", "Room", "Maintenance", "Staff", "Neighbor", "Other"] as const;
  const cSubj: Record<(typeof cCat)[number], string> = {
    Security: "Gate B left unattended at night", Noise: "Loud music after curfew", Room: "Window does not lock",
    Maintenance: "Shower has no hot water", Staff: "Rude response at reception", Neighbor: "Neighbour borrowing items without asking", Other: "Request for a study room extension",
  };
  const complaints: Complaint[] = Array.from({ length: 16 }, (_, i) => {
    const category = cCat[i % cCat.length];
    const status = pick(["Submitted", "Under Review", "In Progress", "Resolved", "Closed"] as const);
    return {
      id: `CMP-${pad(i + 1)}`, residentId: i < 3 ? residents[0].id : pick(active).id, category, subject: cSubj[category],
      description: `${cSubj[category]}. This has happened several times this week and needs attention.`,
      submittedAt: at(int(0, 45)), priority: pick(["Low", "Medium", "High", "Urgent"] as const),
      assignedStaff: status === "Submitted" ? null : "Ruth Kamau", status,
      resolution: status === "Resolved" || status === "Closed" ? "Issue addressed by hostel management." : "",
    };
  });

  // Maintenance
  const mCat = ["Plumbing", "Electrical", "Furniture", "Internet", "Cleaning", "Room Damage", "Other"] as const;
  const mDesc: Record<(typeof mCat)[number], string> = {
    Plumbing: "Leaking tap in the bathroom, water pooling on floor.", Electrical: "Socket near the desk sparks when used.",
    Furniture: "Bed frame slat broken.", Internet: "Wi-Fi drops every few minutes in the room.", Cleaning: "Corridor bins not emptied for three days.",
    "Room Damage": "Door hinge loose; door does not close properly.", Other: "Request extra shelf for books.",
  };
  const maintenance: MaintenanceRequest[] = Array.from({ length: 20 }, (_, i) => {
    const category = mCat[i % mCat.length];
    const resd = i < 3 ? residents[0] : pick(active);
    const status = pick(["Pending", "Pending", "Assigned", "In Progress", "Completed", "Completed", "Cancelled"] as const);
    return {
      id: `MNT-${pad(i + 1)}`, residentId: resd.id, roomId: resd.roomId, category, description: mDesc[category],
      priority: pick(["Low", "Medium", "High", "Urgent"] as const), createdAt: at(int(0, 40)),
      technician: status === "Pending" ? null : pick(techs), status,
      resolution: status === "Completed" ? "Repaired and tested." : "",
    };
  });

  // Payments — last 6 months for every allocated resident
  const payments: Payment[] = [];
  let pid = 1;
  for (let mBack = 5; mBack >= 0; mBack--) {
    const d = new Date(now); d.setDate(1); d.setMonth(d.getMonth() - mBack);
    const period = `${d.getFullYear()}-${pad(d.getMonth() + 1, 2)}`;
    const due = new Date(d.getFullYear(), d.getMonth(), 5).toISOString();
    for (const res of active) {
      const rent = rooms.find((x) => x.id === res.roomId)!.monthlyRent;
      const roll = r();
      let status: Payment["status"]; let paid = 0;
      if (mBack >= 2) { status = roll < 0.92 ? "Paid" : "Overdue"; }
      else if (mBack === 1) { status = roll < 0.78 ? "Paid" : roll < 0.88 ? "Partially Paid" : "Overdue"; }
      else { status = roll < 0.55 ? "Paid" : roll < 0.7 ? "Partially Paid" : "Pending"; }
      if (res.id === residents[0].id) status = mBack === 0 ? "Pending" : "Paid";
      if (status === "Paid") paid = rent; else if (status === "Partially Paid") paid = Math.round(rent * 0.5);
      const method = paid ? pick(["M-Pesa", "M-Pesa", "M-Pesa", "Bank", "Cash"] as const) : null;
      payments.push({
        id: `PAY-${pad(pid++, 5)}`, residentId: res.id, amountDue: rent, amountPaid: paid, method,
        reference: method === "M-Pesa" ? `S${Math.floor(r() * 1e9).toString(36).toUpperCase().padEnd(9, "X")}` : method ? `TRX${int(100000, 999999)}` : "",
        paidAt: paid ? new Date(new Date(due).getTime() - int(-8, 4) * 86400000).toISOString() : null,
        dueDate: due, period, status,
      });
    }
  }

  const notifications: AppNotification[] = [
    { type: "Incident Alert", title: "Critical incident reported", message: "Unauthorized access attempt at Gate B (INC-2026-0141).", audience: ["SUPER_ADMIN", "HOSTEL_ADMIN", "SECURITY_OFFICER"] },
    { type: "Visitor Arrival", title: "Visitor checked in", message: "John Doe checked in to visit you at Gate A.", audience: [], userId: "USR-004" },
    { type: "Payment Reminder", title: "Rent due on the 5th", message: "Your rent for this month is pending. Please pay before the due date.", audience: [], userId: "USR-004" },
    { type: "Security Alert", title: "Denied access attempt", message: "Unknown person denied entry at Gate B.", audience: ["SUPER_ADMIN", "SECURITY_OFFICER"] },
    { type: "Visitor Approval", title: "2 visitors pending approval", message: "Mary Wairimu and Ali Hassan await approval.", audience: ["SECURITY_OFFICER", "HOSTEL_ADMIN"] },
    { type: "Maintenance Update", title: "Maintenance request assigned", message: "Your plumbing request was assigned to Joseph Wafula.", audience: [], userId: "USR-004" },
    { type: "Announcement", title: "Water interruption Saturday", message: "Water supply will be off 9am–1pm for tank cleaning.", audience: ["RESIDENT", "HOSTEL_ADMIN", "SECURITY_OFFICER", "SUPER_ADMIN"] },
    { type: "Maintenance Update", title: "4 urgent maintenance requests", message: "Urgent requests are awaiting technician assignment.", audience: ["HOSTEL_ADMIN", "SUPER_ADMIN"] },
    { type: "Payment Reminder", title: "Overdue payments", message: "Several residents have overdue balances this month.", audience: ["HOSTEL_ADMIN", "SUPER_ADMIN"] },
    { type: "Visitor Checkout", title: "Visitor checked out", message: "Grace Achieng checked out at Gate A.", audience: ["SECURITY_OFFICER"] },
  ].map((n, i) => ({ id: `NTF-${pad(i + 1)}`, createdAt: at(i < 4 ? 0 : int(1, 5)), readBy: i > 6 ? ["USR-001", "USR-002", "USR-003", "USR-004"] : [], userId: null, ...n })) as AppNotification[];

  const announcements: Announcement[] = [
    { title: "Water interruption this Saturday", message: "Water supply will be interrupted from 9:00am to 1:00pm for tank cleaning. Please store water in advance.", category: "Maintenance", priority: "High" },
    { title: "New visitor policy", message: "All visitors must present original ID at the gate and leave by 9:00pm. Overnight guests are not allowed.", category: "Security", priority: "High" },
    { title: "Rent due on the 5th", message: "Monthly rent is due by the 5th. Pay via M-Pesa paybill 400200, account = your admission number.", category: "Payment", priority: "Normal" },
    { title: "Fire drill next Wednesday", message: "A fire evacuation drill will be held at 10:00am. Assemble at the main parking lot.", category: "Emergency", priority: "Critical" },
    { title: "Welcome back, residents", message: "Welcome to the new semester. The study room in Block C is now open 24 hours.", category: "General", priority: "Normal" },
    { title: "Lost keys at reception", message: "A bunch of keys with a red tag was handed in at reception. Claim with ID.", category: "General", priority: "Normal" },
  ].map((a, i) => ({
    id: `ANN-${pad(i + 1)}`, publishedBy: i % 2 ? "Daniel Mutiso" : "Ruth Kamau", publishedAt: at(i * 3),
    expiresAt: new Date(now + (i === 5 ? -2 : 20 - i) * 86400000).toISOString().slice(0, 10), ...a,
  })) as Announcement[];

  const lostFound: LostFoundItem[] = [
    ["Black HP laptop charger", "Electronics", "Block C study room"], ["Student ID card", "Documents", "Gate A"],
    ["Blue umbrella", "Other", "Cafeteria"], ["Keys with red tag", "Keys", "Reception"], ["Grey hoodie", "Clothing", "Laundry room"],
    ["Wallet (brown leather)", "Documents", "Parking lot"], ["AirPods case", "Electronics", "Block A corridor"],
    ["Backpack (Jansport)", "Bags", "Common room"], ["Calculator Casio fx-991", "Electronics", "Block D stairwell"], ["Water bottle", "Other", "Gym"],
  ].map(([name, category, location], i) => {
    const status = i < 5 ? "Unclaimed" : i < 8 ? "Claimed" : "Returned";
    return {
      id: `LF-${pad(i + 1)}`, name, category, location, description: `${name} found at ${location}.`,
      foundAt: at(int(0, 20)), foundBy: i % 3 === 0 ? residents[0].fullName : pick(officers), kind: i === 9 ? "Lost" : "Found",
      image: null, status, claimedBy: status !== "Unclaimed" ? pick(active).fullName : null,
      claimedAt: status !== "Unclaimed" ? at(int(0, 5)) : null,
    } as LostFoundItem;
  });

  const emergencyContacts: EmergencyContact[] = [
    ["Hostel Management Office", "Hostel management", "+254 711 000 100", "Mon–Sat 8am–6pm"],
    ["Security Office (24/7)", "Security office", "+254 711 000 999", "24 hours"],
    ["Kenya Police", "Police", "999", "24 hours"],
    ["Fire Department", "Fire department", "+254 20 222 2181", "24 hours"],
    ["St. John Ambulance", "Ambulance", "+254 721 225 285", "24 hours"],
    ["University Administration", "University administration", "+254 20 400 0000", "Mon–Fri 8am–5pm"],
    ["Emergency Maintenance", "Emergency maintenance", "+254 711 000 777", "24 hours"],
  ].map(([name, category, phone, available], i) => ({ id: `EMC-${i + 1}`, name, category, phone, available }));

  const auditSeed: [string, User["role"] | "SYSTEM", string, string, string, AuditLog["result"]][] = [
    ["Moses Kiptoo", "SECURITY_OFFICER", "CHECK_IN", "Visitors", "Security Officer logged visitor John Doe into the hostel.", "Success"],
    ["Ruth Kamau", "HOSTEL_ADMIN", "UPDATE", "Residents", `Administrator updated Resident #${residents[4].id}.`, "Success"],
    ["Ruth Kamau", "HOSTEL_ADMIN", "ALLOCATE", "Allocations", "Administrator changed room allocation.", "Success"],
    ["Moses Kiptoo", "SECURITY_OFFICER", "DENY", "Visitors", "Security Officer denied visitor access.", "Success"],
    ["Daniel Mutiso", "SUPER_ADMIN", "LOGIN", "Auth", "User logged in.", "Success"],
    ["unknown@mail.com", "SYSTEM", "LOGIN", "Auth", "Failed login attempt: invalid credentials.", "Failure"],
    ["Peter Njoroge", "SECURITY_OFFICER", "CREATE", "Incidents", "Security Officer reported incident INC-2026-0141.", "Success"],
    ["Moses Kiptoo", "SECURITY_OFFICER", "DELETE", "Residents", "Attempted to delete a resident — permission denied.", "Denied"],
    ["Ruth Kamau", "HOSTEL_ADMIN", "CREATE", "Payments", "Recorded payment for RES-1012.", "Success"],
    ["Daniel Mutiso", "SUPER_ADMIN", "UPDATE", "Settings", "Updated security settings: session timeout 30 min.", "Success"],
    ["Daniel Mutiso", "SUPER_ADMIN", "STATUS", "Users", "Suspended user Lucy Chebet.", "Success"],
    ["Moses Kiptoo", "SECURITY_OFFICER", "ENTRY", "Access Control", "Recorded entry at Gate A.", "Success"],
    ["Moses Kiptoo", "SECURITY_OFFICER", "CHECK_OUT", "Visitors", "Visitor Grace Achieng checked out.", "Success"],
    ["Ruth Kamau", "HOSTEL_ADMIN", "CREATE", "Announcements", "Published announcement 'Water interruption this Saturday'.", "Success"],
  ];
  const auditLogs: AuditLog[] = [];
  for (let i = 0; i < 42; i++) {
    const [user, role, action, module, description, result] = auditSeed[i % auditSeed.length];
    auditLogs.push({
      id: `AUD-${pad(i + 1, 6)}`, userId: role === "SYSTEM" ? null : users.find((u) => u.fullName === user)?.id ?? null,
      user, role, action, module, description, timestamp: at(Math.floor(i / 5)),
      ip: `10.0.${int(0, 9)}.${int(2, 254)}`, device: pick(["Chrome 129 / Windows", "Safari / iOS 18", "Firefox / Ubuntu", "Chrome / Android"]), result,
    });
  }
  auditLogs.sort((a, b) => b.timestamp.localeCompare(a.timestamp));

  const loginAttempts: LoginAttempt[] = Array.from({ length: 16 }, (_, i) => ({
    id: `LGA-${pad(i + 1, 5)}`, email: i % 4 === 3 ? "unknown@mail.com" : pick(users).email, success: i % 4 !== 3,
    reason: i % 4 === 3 ? "Invalid credentials" : "OK", timestamp: at(Math.floor(i / 3)), ip: `10.0.${int(0, 9)}.${int(2, 254)}`,
  }));

  return {
    version: 1, users, seedPasswords, residents, rooms, beds, allocations, visitors, accessLogs, incidents, complaints,
    maintenance, payments, staff, notifications, announcements, lostFound, emergencyContacts, auditLogs, loginAttempts,
    settings: {
      sessionTimeoutMinutes: 30, maxLoginAttempts: 5, lockoutMinutes: 15, passwordMinLength: 10,
      requireMfaForAdmins: false, visitorMaxHours: 6, curfewTime: "22:00", auditRetentionDays: 365,
    },
  };
}
