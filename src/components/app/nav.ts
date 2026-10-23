import {
  AlertOctagon, BarChart3, Bed, Bell, BedDouble, Building2, ClipboardList, DoorOpen, FileWarning,
  Home, KeyRound, LayoutDashboard, Megaphone, MessageSquareWarning, PackageSearch, Phone, Radar, Receipt,
  ScrollText, Settings, ShieldAlert, UserCog, UserPlus, Users, Wallet, Wrench, Contact, type LucideIcon,
} from "lucide-react";
import type { Permission } from "@/lib/auth/permissions";

export type Area = "admin" | "security" | "resident";
export interface NavItem { label: string; to: string; icon: LucideIcon; perm?: Permission }
export interface NavGroup { label?: string; items: NavItem[] }

export const NAV: Record<Area, NavGroup[]> = {
  admin: [
    { items: [{ label: "Dashboard", to: "/admin/dashboard", icon: LayoutDashboard }] },
    { label: "Residents", items: [
      { label: "All Residents", to: "/admin/residents", icon: Users },
      { label: "Add Resident", to: "/admin/residents/new", icon: UserPlus, perm: "residents:create" },
    ] },
    { label: "Accommodation", items: [
      { label: "Rooms", to: "/admin/rooms", icon: Building2 },
      { label: "Beds", to: "/admin/beds", icon: BedDouble },
      { label: "Allocations", to: "/admin/allocations", icon: Bed },
    ] },
    { label: "Security", items: [
      { label: "Security Dashboard", to: "/admin/monitoring", icon: Radar },
      { label: "Visitors", to: "/admin/visitors", icon: Contact },
      { label: "Access Control", to: "/admin/access", icon: DoorOpen },
      { label: "Incidents", to: "/admin/incidents", icon: ShieldAlert },
      { label: "Lost & Found", to: "/admin/lost-found", icon: PackageSearch },
      { label: "Emergency", to: "/admin/emergency", icon: Phone },
    ] },
    { label: "Finance", items: [
      { label: "Payments", to: "/admin/payments", icon: Wallet },
      { label: "Outstanding Payments", to: "/admin/outstanding", icon: Receipt },
    ] },
    { label: "Operations", items: [
      { label: "Maintenance", to: "/admin/maintenance", icon: Wrench },
      { label: "Complaints", to: "/admin/complaints", icon: MessageSquareWarning },
      { label: "Staff", to: "/admin/staff", icon: ClipboardList, perm: "staff:read" },
    ] },
    { label: "Communication", items: [
      { label: "Announcements", to: "/admin/announcements", icon: Megaphone },
      { label: "Notifications", to: "/admin/notifications", icon: Bell },
    ] },
    { label: "System", items: [
      { label: "Reports", to: "/admin/reports", icon: BarChart3 },
      { label: "Audit Logs", to: "/admin/audit", icon: ScrollText, perm: "audit:read" },
      { label: "Users", to: "/admin/users", icon: UserCog, perm: "users:read" },
      { label: "Settings", to: "/admin/settings", icon: Settings, perm: "settings:read" },
    ] },
  ],
  security: [
    { items: [
      { label: "Dashboard", to: "/security/dashboard", icon: LayoutDashboard },
      { label: "Visitors", to: "/security/visitors", icon: Contact },
      { label: "Access Control", to: "/security/access", icon: DoorOpen },
      { label: "Incidents", to: "/security/incidents", icon: ShieldAlert },
      { label: "Lost & Found", to: "/security/lost-found", icon: PackageSearch },
      { label: "Residents", to: "/security/residents", icon: Users },
      { label: "Emergency Contacts", to: "/security/emergency", icon: Phone },
      { label: "Audit Trail", to: "/security/audit", icon: ScrollText },
      { label: "Notifications", to: "/security/notifications", icon: Bell },
    ] },
  ],
  resident: [
    { items: [
      { label: "Dashboard", to: "/resident/dashboard", icon: Home },
      { label: "My Profile", to: "/resident/profile", icon: UserCog },
      { label: "My Room", to: "/resident/room", icon: BedDouble },
      { label: "My Payments", to: "/resident/payments", icon: Wallet },
      { label: "Visitors", to: "/resident/visitors", icon: Contact },
      { label: "Complaints", to: "/resident/complaints", icon: MessageSquareWarning },
      { label: "Maintenance", to: "/resident/maintenance", icon: Wrench },
      { label: "Report Incident", to: "/resident/report-incident", icon: FileWarning },
      { label: "Lost & Found", to: "/resident/lost-found", icon: PackageSearch },
      { label: "Announcements", to: "/resident/announcements", icon: Megaphone },
      { label: "Emergency", to: "/resident/emergency", icon: AlertOctagon },
      { label: "Notifications", to: "/resident/notifications", icon: Bell },
    ] },
  ],
};

export const MOBILE_TABS: Record<Area, NavItem[]> = {
  admin: [NAV.admin[0].items[0], { label: "Visitors", to: "/admin/visitors", icon: Contact }, { label: "Security", to: "/admin/monitoring", icon: Radar }],
  security: [NAV.security[0].items[0], NAV.security[0].items[1], NAV.security[0].items[2]],
  resident: [NAV.resident[0].items[0], NAV.resident[0].items[4], NAV.resident[0].items[3]],
};

export const ACCOUNT_PATH: Record<Area, string> = { admin: "/admin/account", security: "/security/account", resident: "/resident/account" };
export const KeyIcon = KeyRound;
