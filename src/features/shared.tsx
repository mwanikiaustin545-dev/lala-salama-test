import { useMemo } from "react";
import { useRouterState } from "@tanstack/react-router";
import { useBeds, useResidents, useRooms } from "@/lib/api/hooks";
import type { Area } from "@/components/app/nav";

export function useArea(): Area {
  const p = useRouterState({ select: (s) => s.location.pathname });
  return p.startsWith("/security") ? "security" : p.startsWith("/resident") ? "resident" : "admin";
}

/** Id → entity lookup maps for joining related records in the UI. */
export function useLookups() {
  const residents = useResidents();
  const rooms = useRooms();
  const beds = useBeds();
  return useMemo(() => {
    const R = new Map((residents.data ?? []).map((r) => [r.id, r]));
    const RM = new Map((rooms.data ?? []).map((r) => [r.id, r]));
    const B = new Map((beds.data ?? []).map((b) => [b.id, b]));
    return {
      queries: [residents, rooms, beds],
      residents: residents.data ?? [], rooms: rooms.data ?? [], beds: beds.data ?? [],
      resident: (id?: string | null) => (id ? R.get(id) : undefined),
      residentName: (id?: string | null) => (id ? R.get(id)?.fullName ?? id : "—"),
      room: (id?: string | null) => (id ? RM.get(id) : undefined),
      roomNo: (id?: string | null) => (id ? RM.get(id)?.number ?? "—" : "—"),
      bed: (id?: string | null) => (id ? B.get(id) : undefined),
    };
  }, [residents, rooms, beds]);
}

export const chartTooltip = {
  contentStyle: { background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 8, color: "var(--foreground)", fontSize: 12 },
  labelStyle: { color: "var(--muted-foreground)" },
  cursor: { fill: "oklch(1 0 0 / 5%)" },
};
export const axis = { stroke: "var(--subtle)", fontSize: 11, tickLine: false, axisLine: false } as const;
export const CHART_COLORS = ["var(--chart-1)", "var(--chart-2)", "var(--chart-3)", "var(--chart-4)", "var(--chart-5)", "var(--muted-foreground)"];
