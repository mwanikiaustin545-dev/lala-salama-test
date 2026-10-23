import type { Role } from "@/lib/types";

/**
 * Least-privilege permission matrix. The same matrix is enforced by the
 * (mock) API layer and used by the UI to hide controls. A Spring Boot
 * backend should mirror it with @PreAuthorize("hasAuthority('residents:delete')").
 */
export type Module =
  | "dashboard" | "security" | "residents" | "rooms" | "beds" | "allocations" | "visitors"
  | "access" | "incidents" | "lostfound" | "payments" | "maintenance" | "complaints"
  | "staff" | "announcements" | "notifications" | "emergency" | "reports" | "audit"
  | "users" | "settings";
export type Action = "read" | "create" | "update" | "delete";
export type Permission = `${Module}:${Action}`;

const crud = (m: Module): Permission[] => [`${m}:read`, `${m}:create`, `${m}:update`, `${m}:delete`];

const MATRIX: Record<Role, Permission[] | "*"> = {
  SUPER_ADMIN: "*",
  HOSTEL_ADMIN: [
    "dashboard:read", "security:read",
    ...crud("residents"), ...crud("rooms"), ...crud("beds"), ...crud("allocations"),
    ...crud("payments"), ...crud("complaints"), ...crud("maintenance"), ...crud("visitors"),
    ...crud("lostfound"), ...crud("announcements"),
    "access:read", "incidents:read", "incidents:update", "incidents:create",
    "staff:read", "notifications:read", "emergency:read", "reports:read",
  ],
  SECURITY_OFFICER: [
    "dashboard:read", "security:read",
    "residents:read", "rooms:read", "beds:read",
    "visitors:read", "visitors:create", "visitors:update",
    "access:read", "access:create", "access:update",
    "incidents:read", "incidents:create", "incidents:update",
    "lostfound:read", "lostfound:create", "lostfound:update",
    "emergency:read", "notifications:read", "announcements:read", "audit:read",
  ],
  RESIDENT: [
    "dashboard:read", "residents:read", "rooms:read", "beds:read", "payments:read",
    "visitors:read", "visitors:create", "complaints:read", "complaints:create",
    "maintenance:read", "maintenance:create", "incidents:read", "incidents:create",
    "lostfound:read", "lostfound:create", "announcements:read", "notifications:read",
    "emergency:read",
  ],
};

export function can(role: Role | undefined | null, perm: Permission): boolean {
  if (!role) return false;
  const p = MATRIX[role];
  return p === "*" || p.includes(perm);
}

/** Roles whose list endpoints are scoped to their own records server-side. */
export const isSelfScoped = (role: Role) => role === "RESIDENT";

export const ROLE_LABEL: Record<Role, string> = {
  SUPER_ADMIN: "Super Admin",
  HOSTEL_ADMIN: "Hostel Administrator",
  SECURITY_OFFICER: "Security Officer",
  RESIDENT: "Resident",
};

export const ROLE_HOME: Record<Role, "/admin/dashboard" | "/security/dashboard" | "/resident/dashboard"> = {
  SUPER_ADMIN: "/admin/dashboard",
  HOSTEL_ADMIN: "/admin/dashboard",
  SECURITY_OFFICER: "/security/dashboard",
  RESIDENT: "/resident/dashboard",
};

/** Which URL area each role may enter. */
export const AREA_ROLES: Record<"admin" | "security" | "resident", Role[]> = {
  admin: ["SUPER_ADMIN", "HOSTEL_ADMIN"],
  security: ["SECURITY_OFFICER"],
  resident: ["RESIDENT"],
};

export const SECURITY_AUDIT_MODULES = ["Visitors", "Access Control", "Incidents", "Lost & Found", "Auth"];
