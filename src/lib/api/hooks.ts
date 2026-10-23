import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import * as s from "./services";
import { ApiError } from "./http";

export const qk = {
  residents: ["residents"], rooms: ["rooms"], beds: ["beds"], allocations: ["allocations"], visitors: ["visitors"],
  access: ["access-logs"], incidents: ["incidents"], complaints: ["complaints"], maintenance: ["maintenance"],
  payments: ["payments"], staff: ["staff"], announcements: ["announcements"], lostFound: ["lost-found"],
  emergency: ["emergency"], notifications: ["notifications"], audit: ["audit-logs"], loginAttempts: ["login-attempts"],
  users: ["users"], settings: ["settings"],
} as const;

const opt = { staleTime: 15_000, retry: (n: number, e: unknown) => !(e instanceof ApiError && [401, 403, 404].includes(e.status)) && n < 2 };
export const useResidents = () => useQuery({ queryKey: qk.residents, queryFn: s.residentsApi.list, ...opt });
export const useRooms = () => useQuery({ queryKey: qk.rooms, queryFn: s.roomsApi.list, ...opt });
export const useBeds = () => useQuery({ queryKey: qk.beds, queryFn: s.bedsApi.list, ...opt });
export const useAllocations = () => useQuery({ queryKey: qk.allocations, queryFn: s.allocationsApi.list, ...opt });
export const useVisitors = () => useQuery({ queryKey: qk.visitors, queryFn: s.visitorsApi.list, ...opt });
export const useAccessLogs = () => useQuery({ queryKey: qk.access, queryFn: s.accessApi.list, ...opt });
export const useIncidents = () => useQuery({ queryKey: qk.incidents, queryFn: s.incidentsApi.list, ...opt });
export const useComplaints = () => useQuery({ queryKey: qk.complaints, queryFn: s.complaintsApi.list, ...opt });
export const useMaintenance = () => useQuery({ queryKey: qk.maintenance, queryFn: s.maintenanceApi.list, ...opt });
export const usePayments = () => useQuery({ queryKey: qk.payments, queryFn: s.paymentsApi.list, ...opt });
export const useStaff = () => useQuery({ queryKey: qk.staff, queryFn: s.staffApi.list, ...opt });
export const useAnnouncements = () => useQuery({ queryKey: qk.announcements, queryFn: s.announcementsApi.list, ...opt });
export const useLostFound = () => useQuery({ queryKey: qk.lostFound, queryFn: s.lostFoundApi.list, ...opt });
export const useEmergency = () => useQuery({ queryKey: qk.emergency, queryFn: s.emergencyApi.list, ...opt });
export const useNotifications = () => useQuery({ queryKey: qk.notifications, queryFn: s.notificationsApi.list, ...opt, refetchInterval: 30_000 });
export const useAuditLogs = () => useQuery({ queryKey: qk.audit, queryFn: s.auditApi.list, ...opt });
export const useLoginAttempts = () => useQuery({ queryKey: qk.loginAttempts, queryFn: s.auditApi.loginAttempts, ...opt });
export const useUsers = () => useQuery({ queryKey: qk.users, queryFn: s.usersApi.list, ...opt });
export const useSettings = () => useQuery({ queryKey: qk.settings, queryFn: s.settingsApi.get, ...opt });

/** Generic mutation: runs fn, toasts, and invalidates everything (audit logs change on every write). */
export function useAction<A, R>(fn: (a: A) => Promise<R>, success?: string | ((r: R) => string)) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: fn,
    onSuccess: (r) => {
      qc.invalidateQueries();
      if (success) toast.success(typeof success === "function" ? success(r) : success);
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Something went wrong"),
  });
}
