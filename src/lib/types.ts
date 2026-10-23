// Domain types. These mirror the MySQL tables in docs/database-schema.sql and the
// DTOs a Spring Boot backend is expected to return from /api/*.

export type Role = "SUPER_ADMIN" | "HOSTEL_ADMIN" | "SECURITY_OFFICER" | "RESIDENT";
export type UserStatus = "Active" | "Suspended" | "Disabled";

export interface User {
  id: string;
  fullName: string;
  email: string;
  phone: string;
  username: string;
  role: Role;
  status: UserStatus;
  lastLogin: string | null;
  createdAt: string;
  residentId?: string | null;
  staffId?: string | null;
  failedAttempts: number;
  lockedUntil: string | null;
}

/** Server-side only record (never returned to the client). */
export interface UserCredential {
  userId: string;
  passwordHash: string;
  salt: string;
}

export type ResidentStatus = "Active" | "Checked Out" | "Suspended" | "Expelled" | "Graduated";
export interface Resident {
  id: string;
  admissionNo: string;
  fullName: string;
  gender: "Male" | "Female";
  dob: string;
  phone: string;
  email: string;
  course: string;
  department: string;
  yearOfStudy: number;
  emergencyName: string;
  emergencyPhone: string;
  roomId: string | null;
  bedId: string | null;
  registeredAt: string;
  status: ResidentStatus;
  photo?: string | null;
}

export type RoomType = "Single" | "Double" | "Triple" | "Shared";
export type RoomStatus = "Available" | "Partially Occupied" | "Fully Occupied" | "Maintenance" | "Closed";
export interface Room {
  id: string;
  number: string;
  block: string;
  floor: number;
  type: RoomType;
  capacity: number;
  status: RoomStatus;
  monthlyRent: number;
}

export type BedStatus = "Available" | "Occupied" | "Reserved" | "Maintenance";
export interface Bed {
  id: string;
  number: string;
  roomId: string;
  status: BedStatus;
  residentId: string | null;
}

export interface Allocation {
  id: string;
  residentId: string;
  roomId: string;
  bedId: string;
  allocatedAt: string;
  allocatedBy: string;
  endedAt: string | null;
}

export type VisitorStatus = "Pending" | "Approved" | "Checked In" | "Checked Out" | "Denied" | "Blacklisted";
export interface Visitor {
  id: string;
  fullName: string;
  idType: "National ID" | "Passport" | "Student ID" | "Driving Licence";
  idNumber: string;
  phone: string;
  residentId: string;
  relationship: string;
  purpose: string;
  vehicleReg: string;
  checkIn: string | null;
  expectedCheckOut: string | null;
  checkOut: string | null;
  status: VisitorStatus;
  officer: string | null;
  flagged: boolean;
  passNo: string | null;
  createdAt: string;
}

export type PersonType = "Resident" | "Visitor" | "Staff" | "Contractor" | "Delivery Personnel";
export type AccessStatus = "Granted" | "Denied" | "Pending";
export interface AccessLog {
  id: string;
  person: string;
  personType: PersonType;
  reference: string;
  entryTime: string;
  exitTime: string | null;
  gate: "Gate A" | "Gate B" | "Service Gate";
  officer: string;
  purpose: string;
  status: AccessStatus;
}

export type IncidentType =
  | "Theft" | "Unauthorized Access" | "Assault" | "Property Damage" | "Suspicious Activity"
  | "Fire" | "Noise Complaint" | "Missing Person" | "Harassment" | "Other";
export type Severity = "Low" | "Medium" | "High" | "Critical";
export type IncidentStatus = "Reported" | "Under Investigation" | "Escalated" | "Resolved" | "Closed";
export interface Incident {
  id: string;
  number: string;
  type: IncidentType;
  occurredAt: string;
  location: string;
  reportedBy: string;
  reportedByUserId: string;
  residentId: string | null;
  peopleInvolved: string;
  witnesses: string;
  description: string;
  severity: Severity;
  evidence: string[];
  assignedOfficer: string | null;
  status: IncidentStatus;
  resolution: string;
  resolvedAt: string | null;
  createdAt: string;
}

export type ComplaintCategory = "Security" | "Noise" | "Room" | "Maintenance" | "Staff" | "Neighbor" | "Other";
export type ComplaintStatus = "Submitted" | "Under Review" | "In Progress" | "Resolved" | "Closed";
export type Priority = "Low" | "Medium" | "High" | "Urgent";
export interface Complaint {
  id: string;
  residentId: string;
  category: ComplaintCategory;
  subject: string;
  description: string;
  submittedAt: string;
  priority: Priority;
  assignedStaff: string | null;
  status: ComplaintStatus;
  resolution: string;
}

export type MaintenanceCategory =
  | "Plumbing" | "Electrical" | "Furniture" | "Internet" | "Cleaning" | "Room Damage" | "Other";
export type MaintenanceStatus = "Pending" | "Assigned" | "In Progress" | "Completed" | "Cancelled";
export interface MaintenanceRequest {
  id: string;
  residentId: string;
  roomId: string | null;
  category: MaintenanceCategory;
  description: string;
  priority: Priority;
  createdAt: string;
  technician: string | null;
  status: MaintenanceStatus;
  resolution: string;
}

export type PaymentStatus = "Paid" | "Pending" | "Overdue" | "Partially Paid";
export type PaymentMethod = "M-Pesa" | "Bank" | "Cash" | "Other";
export interface Payment {
  id: string;
  residentId: string;
  amountDue: number;
  amountPaid: number;
  method: PaymentMethod | null;
  reference: string;
  paidAt: string | null;
  dueDate: string;
  period: string; // YYYY-MM
  status: PaymentStatus;
}

export type StaffRole = "Administrator" | "Security Officer" | "Cleaner" | "Maintenance Technician" | "Manager";
export interface Staff {
  id: string;
  fullName: string;
  phone: string;
  email: string;
  role: StaffRole;
  department: string;
  status: "Active" | "On Leave" | "Terminated";
  joinedAt: string;
  photo?: string | null;
}

export type NotificationType =
  | "Visitor Approval" | "Visitor Arrival" | "Visitor Checkout" | "Incident Alert"
  | "Maintenance Update" | "Payment Reminder" | "Announcement" | "Security Alert";
export interface AppNotification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  createdAt: string;
  audience: Role[];
  userId: string | null;
  readBy: string[];
}

export type AnnouncementCategory = "General" | "Security" | "Maintenance" | "Emergency" | "Payment";
export interface Announcement {
  id: string;
  title: string;
  message: string;
  category: AnnouncementCategory;
  priority: "Normal" | "High" | "Critical";
  publishedBy: string;
  publishedAt: string;
  expiresAt: string;
}

export interface LostFoundItem {
  id: string;
  name: string;
  description: string;
  category: "Electronics" | "Documents" | "Clothing" | "Keys" | "Bags" | "Other";
  location: string;
  foundAt: string;
  foundBy: string;
  kind: "Lost" | "Found";
  image?: string | null;
  status: "Unclaimed" | "Claimed" | "Returned";
  claimedBy: string | null;
  claimedAt: string | null;
}

export interface EmergencyContact {
  id: string;
  name: string;
  category: string;
  phone: string;
  altPhone?: string;
  available: string;
}

export interface AuditLog {
  id: string;
  userId: string | null;
  user: string;
  role: Role | "SYSTEM";
  action: string;
  module: string;
  description: string;
  timestamp: string;
  ip: string;
  device: string;
  result: "Success" | "Failure" | "Denied";
}

export interface LoginAttempt {
  id: string;
  email: string;
  success: boolean;
  reason: string;
  timestamp: string;
  ip: string;
}

export interface SystemSettings {
  sessionTimeoutMinutes: number;
  maxLoginAttempts: number;
  lockoutMinutes: number;
  passwordMinLength: number;
  requireMfaForAdmins: boolean;
  visitorMaxHours: number;
  curfewTime: string;
  auditRetentionDays: number;
}

export interface Session {
  token: string;
  user: User;
  expiresAt: number;
}
