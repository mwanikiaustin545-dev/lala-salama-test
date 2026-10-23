// Service layer — the ONLY place UI talks to the backend. Each service maps
// 1:1 onto the REST endpoints in docs/API.md.
import { http } from "./http";
import type {
  AccessLog, Allocation, Announcement, AppNotification, AuditLog, Bed, Complaint, EmergencyContact,
  Incident, LoginAttempt, LostFoundItem, MaintenanceRequest, Payment, Resident, Room, Session, Staff,
  SystemSettings, User, Visitor,
} from "@/lib/types";

function crud<T extends { id: string }>(base: string) {
  return {
    list: () => http.get<T[]>(base),
    get: (id: string) => http.get<T>(`${base}/${id}`),
    create: (data: unknown) => http.post<T>(base, data),
    update: (id: string, data: unknown) => http.put<T>(`${base}/${id}`, data),
    remove: (id: string) => http.del<T>(`${base}/${id}`),
  };
}

export const authApi = {
  login: (email: string, password: string) => http.post<Omit<Session, "expiresAt"> & { expiresAt: number }>("/auth/login", { email, password }),
  logout: () => http.post("/auth/logout"),
  me: () => http.get<User>("/auth/me"),
  changePassword: (d: { currentPassword: string; newPassword: string; confirm: string }) => http.post("/auth/change-password", d),
  forgotPassword: (email: string) => http.post<{ message: string }>("/auth/forgot-password", { email }),
  resetPassword: (token: string, password: string) => http.post("/auth/reset-password", { token, password }),
};

export const residentsApi = crud<Resident>("/residents");
export const roomsApi = crud<Room>("/rooms");
export const bedsApi = crud<Bed>("/beds");
export const allocationsApi = crud<Allocation>("/allocations");
export const visitorsApi = {
  ...crud<Visitor>("/visitors"),
  action: (id: string, action: "approve" | "deny" | "check-in" | "check-out" | "blacklist" | "flag") => http.post<Visitor>(`/visitors/${id}/${action}`),
};
export const accessApi = { ...crud<AccessLog>("/access-logs"), exit: (id: string) => http.post<AccessLog>(`/access-logs/${id}/exit`) };
export const incidentsApi = crud<Incident>("/incidents");
export const complaintsApi = crud<Complaint>("/complaints");
export const maintenanceApi = crud<MaintenanceRequest>("/maintenance");
export const paymentsApi = crud<Payment>("/payments");
export const staffApi = crud<Staff>("/staff");
export const announcementsApi = crud<Announcement>("/announcements");
export const lostFoundApi = crud<LostFoundItem>("/lost-found");
export const emergencyApi = {
  ...crud<EmergencyContact>("/emergency-contacts"),
  alert: (d: { title: string; message: string; channels: string[] }) => http.post("/emergency-alerts", d),
};
export const notificationsApi = {
  list: () => http.get<AppNotification[]>("/notifications"),
  markRead: (id: string) => http.post(`/notifications/${id}/read`),
  markAllRead: () => http.post("/notifications/read-all"),
};
export const auditApi = { list: () => http.get<AuditLog[]>("/audit-logs"), loginAttempts: () => http.get<LoginAttempt[]>("/login-attempts") };
export const usersApi = {
  ...crud<User & { temporaryPassword?: string }>("/users"),
  resetPassword: (id: string) => http.post<{ temporaryPassword: string }>(`/users/${id}/reset-password`),
  unlock: (id: string) => http.post<User>(`/users/${id}/unlock`),
};
export const settingsApi = { get: () => http.get<SystemSettings>("/settings"), update: (d: unknown) => http.put<SystemSettings>("/settings", d) };
