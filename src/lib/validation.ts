import { z } from "zod";

// Shared validation schemas — used by forms (client) and by the API layer
// (server). The Spring Boot backend should mirror these with Bean Validation.

const phone = z.string().trim().regex(/^\+?[0-9 ]{9,15}$/, "Enter a valid phone number");
const name = z.string().trim().min(2, "Too short").max(100, "Too long");
const text = (max = 1000) => z.string().trim().max(max, `Max ${max} characters`);
const req = (label: string, max = 200) => z.string().trim().min(1, `${label} is required`).max(max);

export const passwordSchema = z
  .string()
  .min(10, "At least 10 characters")
  .max(128)
  .regex(/[A-Z]/, "Include an uppercase letter")
  .regex(/[a-z]/, "Include a lowercase letter")
  .regex(/[0-9]/, "Include a number")
  .regex(/[^A-Za-z0-9]/, "Include a symbol");

export const loginSchema = z.object({
  email: z.string().trim().min(3, "Enter your email or username").max(255),
  password: z.string().min(1, "Enter your password").max(128),
  remember: z.boolean().optional(),
});

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, "Enter your current password"),
    newPassword: passwordSchema,
    confirm: z.string(),
  })
  .refine((d) => d.newPassword === d.confirm, { path: ["confirm"], message: "Passwords do not match" });

export const residentSchema = z.object({
  admissionNo: req("Admission number", 30),
  fullName: name,
  gender: z.enum(["Male", "Female"]),
  dob: req("Date of birth", 10),
  phone,
  email: z.string().trim().email("Invalid email").max(255),
  course: req("Course", 120),
  department: req("Department", 120),
  yearOfStudy: z.coerce.number().int().min(1).max(7),
  emergencyName: name,
  emergencyPhone: phone,
  status: z.enum(["Active", "Checked Out", "Suspended", "Expelled", "Graduated"]),
});

export const roomSchema = z.object({
  number: req("Room number", 10),
  block: req("Block", 5),
  floor: z.coerce.number().int().min(0).max(20),
  type: z.enum(["Single", "Double", "Triple", "Shared"]),
  capacity: z.coerce.number().int().min(1).max(8),
  status: z.enum(["Available", "Partially Occupied", "Fully Occupied", "Maintenance", "Closed"]),
  monthlyRent: z.coerce.number().min(0).max(1_000_000),
});

export const allocationSchema = z.object({
  residentId: req("Resident"),
  bedId: req("Bed"),
});

export const visitorSchema = z.object({
  fullName: name,
  idType: z.enum(["National ID", "Passport", "Student ID", "Driving Licence"]),
  idNumber: z.string().trim().regex(/^[A-Za-z0-9-]{4,20}$/, "4–20 letters/digits"),
  phone,
  residentId: req("Resident being visited"),
  relationship: req("Relationship", 60),
  purpose: req("Purpose", 200),
  vehicleReg: text(15).optional().default(""),
  expectedCheckOut: req("Expected check-out", 30),
});

export const accessSchema = z.object({
  person: name,
  personType: z.enum(["Resident", "Visitor", "Staff", "Contractor", "Delivery Personnel"]),
  reference: req("ID / reference", 40),
  gate: z.enum(["Gate A", "Gate B", "Service Gate"]),
  purpose: req("Purpose", 200),
  status: z.enum(["Granted", "Denied", "Pending"]),
});

export const incidentSchema = z.object({
  type: z.enum([
    "Theft", "Unauthorized Access", "Assault", "Property Damage", "Suspicious Activity",
    "Fire", "Noise Complaint", "Missing Person", "Harassment", "Other",
  ]),
  location: req("Location", 120),
  occurredAt: req("Date and time", 30),
  description: z.string().trim().min(10, "Describe the incident (min 10 characters)").max(2000),
  peopleInvolved: text(500).optional().default(""),
  witnesses: text(500).optional().default(""),
  severity: z.enum(["Low", "Medium", "High", "Critical"]),
  evidence: z.array(z.string().max(200)).max(5).optional().default([]),
});

export const incidentUpdateSchema = z.object({
  status: z.enum(["Reported", "Under Investigation", "Escalated", "Resolved", "Closed"]),
  assignedOfficer: text(100).optional().default(""),
  resolution: text(1000).optional().default(""),
});

export const complaintSchema = z.object({
  category: z.enum(["Security", "Noise", "Room", "Maintenance", "Staff", "Neighbor", "Other"]),
  subject: req("Subject", 120),
  description: z.string().trim().min(10, "Min 10 characters").max(1500),
  priority: z.enum(["Low", "Medium", "High", "Urgent"]),
});

export const maintenanceSchema = z.object({
  category: z.enum(["Plumbing", "Electrical", "Furniture", "Internet", "Cleaning", "Room Damage", "Other"]),
  description: z.string().trim().min(10, "Min 10 characters").max(1500),
  priority: z.enum(["Low", "Medium", "High", "Urgent"]),
});

export const workUpdateSchema = z.object({
  status: req("Status", 30),
  assignee: text(100).optional().default(""),
  resolution: text(1000).optional().default(""),
});

export const paymentSchema = z.object({
  residentId: req("Resident"),
  amountPaid: z.coerce.number().positive("Amount must be positive").max(1_000_000),
  method: z.enum(["M-Pesa", "Bank", "Cash", "Other"]),
  reference: z.string().trim().regex(/^[A-Za-z0-9-]{4,30}$/, "4–30 letters/digits"),
  period: z.string().regex(/^\d{4}-\d{2}$/, "Use YYYY-MM"),
});

export const staffSchema = z.object({
  fullName: name,
  phone,
  email: z.string().trim().email().max(255),
  role: z.enum(["Administrator", "Security Officer", "Cleaner", "Maintenance Technician", "Manager"]),
  department: req("Department", 80),
  status: z.enum(["Active", "On Leave", "Terminated"]),
});

export const announcementSchema = z.object({
  title: req("Title", 120),
  message: z.string().trim().min(5).max(2000),
  category: z.enum(["General", "Security", "Maintenance", "Emergency", "Payment"]),
  priority: z.enum(["Normal", "High", "Critical"]),
  expiresAt: req("Expiry date", 10),
});

export const lostFoundSchema = z.object({
  name: req("Item name", 80),
  description: text(500),
  category: z.enum(["Electronics", "Documents", "Clothing", "Keys", "Bags", "Other"]),
  location: req("Location", 120),
  kind: z.enum(["Lost", "Found"]),
});

export const userSchema = z.object({
  fullName: name,
  email: z.string().trim().email().max(255),
  phone,
  username: z.string().trim().regex(/^[a-z0-9._]{3,30}$/, "3–30 lowercase letters, digits, . or _"),
  role: z.enum(["SUPER_ADMIN", "HOSTEL_ADMIN", "SECURITY_OFFICER", "RESIDENT"]),
  status: z.enum(["Active", "Suspended", "Disabled"]),
});

export const settingsSchema = z.object({
  sessionTimeoutMinutes: z.coerce.number().int().min(5).max(240),
  maxLoginAttempts: z.coerce.number().int().min(3).max(10),
  lockoutMinutes: z.coerce.number().int().min(1).max(1440),
  passwordMinLength: z.coerce.number().int().min(8).max(64),
  requireMfaForAdmins: z.boolean(),
  visitorMaxHours: z.coerce.number().int().min(1).max(24),
  curfewTime: z.string().regex(/^\d{2}:\d{2}$/),
  auditRetentionDays: z.coerce.number().int().min(30).max(3650),
});

export const emergencyAlertSchema = z.object({
  title: req("Title", 120),
  message: z.string().trim().min(5).max(500),
  channels: z.array(z.enum(["In-app", "SMS", "Email"])).min(1, "Pick at least one channel"),
});
